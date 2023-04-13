import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'

import Metrics from '../metrics'
import Copy from '../copy'
import Datatable from '../datatable'
import DecimalsFormat from '../decimals-format'
import EnsProfile from '../ens-profile'
import Image from '../image'

import { daily_transfer_metrics, daily_transfer_volume } from '../../lib/api/metrics'
import { currency_symbol } from '../../lib/object/currency'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { toArray, ellipse, equalsIgnoreCase, loaderColor } from '../../lib/utils'

export default () => {
  const {
    preferences,
    chains,
    assets,
    router_asset_balances,
    dev,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        router_asset_balances: state.router_asset_balances,
        dev: state.dev,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    sdk,
  } = { ...dev }
  const {
    router_asset_balances_data,
  } = { ...router_asset_balances }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    mode,
  } = { ...query }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (sdk && chains_data && assets_data) {
          const volumes =
            toArray(await daily_transfer_volume())
              .filter(v => v.transfer_date)
              .map(v => {
                const {
                  origin_chain,
                  destination_chain,
                  asset,
                  volume,
                } = { ...v }

                const origin_chain_data = getChain(origin_chain, chains_data)
                const destination_chain_data = getChain(destination_chain, chains_data)

                let asset_data = getAsset(null, assets_data, origin_chain_data?.chain_id, asset)

                asset_data = {
                  ...asset_data,
                  ...getContract(origin_chain_data?.chain_id, asset_data?.contracts),
                }

                if (asset_data.contracts) {
                  delete asset_data.contracts
                }

                if (asset_data.next_asset && equalsIgnoreCase(asset_data.next_asset.contract_address, asset)) {
                  asset_data = {
                    ...asset_data,
                    ...asset_data.next_asset,
                  }

                  delete asset_data.next_asset
                }

                const {
                  decimals,
                  price,
                } = { ...asset_data }

                const amount = Number(utils.formatUnits(BigInt(volume || '0'), decimals || 18))

                return {
                  ...v,
                  origin_chain_data,
                  destination_chain_data,
                  asset_data,
                  amount,
                  volume: amount * (price || 0),
                }
              })

          const transfers =
            toArray(await daily_transfer_metrics())
              .filter(t => t.transfer_date)
              .map(t => {
                const {
                  origin_chain,
                  destination_chain,
                } = { ...t }

                const origin_chain_data = getChain(origin_chain, chains_data)
                const destination_chain_data = getChain(destination_chain, chains_data)

                return {
                  ...t,
                  origin_chain_data,
                  destination_chain_data,
                }
              })

          setData(
            {
              raw_volumes: volumes,
              volumes:
                _.orderBy(
                  Object.entries(_.groupBy(volumes, 'router'))
                    .map(([k, v]) => {
                      return {
                        router: k,
                        volume: _.sumBy(v, 'volume'),
                      }
                    }),
                  ['volume'],
                  ['desc'],
                ),
              raw_transfers: transfers,
              transfers:
                _.orderBy(
                  Object.entries(_.groupBy(transfers, 'router'))
                    .map(([k, v]) => {
                      return {
                        router: k,
                        transfers: _.sumBy(v, 'transfer_count'),
                      }
                    }),
                  ['transfers'],
                  ['desc'],
                ),
            }
          )
        }
      }

      getData()
    },
    [sdk, chains_data, assets_data],
  )

  const {
    raw_volumes,
    transfers,
  } = { ...data }

  const routers =
    _.orderBy(
      Object.entries(_.groupBy(Object.values({ ...router_asset_balances_data }).flatMap(t => t), 'address'))
        .map(([k, v]) => {
          return {
            router_address: k,
            assets: _.orderBy(v, ['value'], ['desc']),
          }
        })
        .map(r => {
          const {
            router_address,
            assets,
          } = { ...r }

          const {
            volumes,
            transfers,
          } = { ...data }

          return {
            ...r,
            total_value: _.sumBy(assets, 'value'),
            total_volume: _.sumBy(toArray(volumes).filter(d => equalsIgnoreCase(d.router, router_address)), 'volume'),
            total_transfers: _.sumBy(toArray(transfers).filter(d => equalsIgnoreCase(d.router, router_address)), 'transfers'),
            // total_fee: 33.33,
            supported_chains: _.uniq(assets.map(a => a.chain_id)),
            liquidity_by_chains: _.orderBy(Object.entries(_.groupBy(assets.filter(a => a.chain_data?.id), 'chain_data.id')).map(([k, v]) => { return { chain: k, value: _.sumBy(v, 'value'), i: chains_data.findIndex(c => c.id === k) } }), ['i'], ['asc']),
            liquidity_by_assets: _.orderBy(Object.entries(_.groupBy(assets.filter(a => a.asset_data?.id), 'asset_data.id')).map(([k, v]) => { return { asset: k, value: _.sumBy(v, 'value'), i: assets_data.findIndex(a => a.id === k) } }), ['i'], ['asc']),
          }
        })
        .map(r => {
          const {
            total_value,
            total_volume,
            liquidity_by_chains,
            liquidity_by_assets,
          } = { ...r }

          return {
            ...r,
            liquidity_utilization: total_value && total_volume ? total_volume / total_value : 0,
            liquidity_utilization_by_chains:
              liquidity_by_chains.map(d => {
                const {
                  chain,
                } = { ...d }
                let {
                  value,
                } = { ...d }

                const volume = _.sumBy(toArray(raw_volumes).filter(d => d.destination_chain_data?.id === chain), 'volume')
                value = value && volume ? volume / value : 0

                return { chain, value }
              }),
            liquidity_utilization_by_assets:
              liquidity_by_assets.map(d => {
                const {
                  asset,
                } = { ...d }
                let {
                  value,
                } = { ...d }

                const volume = _.sumBy(toArray(raw_volumes).filter(d => d.asset_data?.id === asset), 'volume')
                value = value && volume ? volume / value : 0

                return { asset, value }
              }),
          }
        }),
      ['total_value'],
      ['desc'],
    )

  const metrics =
    router_asset_balances_data &&
    {
      liquidity: _.sumBy(routers, 'total_value'),
      volume: _.sumBy(routers, 'total_volume'),
      transfers: _.sumBy(transfers, 'transfers'),
      // fee: 33.33,
      supported_chains: _.uniq(routers.flatMap(r => r.supported_chains)),
    }

  return (
    <>
      <div className="mb-6">
        <Metrics
          data={metrics}
        />
      </div>
      <div className="my-4 sm:my-6">
        {router_asset_balances_data ?
          <Datatable
            columns={
              [
                {
                  Header: '#',
                  accessor: 'i',
                  sortType: (a, b) => a.original.i > b.original.i ? 1 : -1,
                  Cell: props => (
                    <span className="font-semibold">
                      {(props.flatRows?.indexOf(props.row) > -1 ? props.flatRows.indexOf(props.row) : props.value) + 1}
                    </span>
                  ),
                },
                {
                  Header: 'Address',
                  accessor: 'router_address',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      value &&
                      (
                        <div className="flex items-center space-x-1">
                          <Link href={`/router/${value}`}>
                            <EnsProfile
                              address={value}
                              noCopy={true}
                              fallback={
                                <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                                  <span className="xl:hidden">
                                    {ellipse(value, 8)}
                                  </span>
                                  <span className="hidden xl:block">
                                    {ellipse(value, 12)}
                                  </span>
                                </span>
                              }
                            />
                          </Link>
                          <Copy
                            value={value}
                          />
                        </div>
                      )
                    )
                  },
                },
                {
                  Header: 'Liquidity',
                  accessor: 'total_value',
                  sortType: (a, b) => a.original.total_value > b.original.total_value ?  1 : -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className="text-base font-bold text-right">
                        {typeof value === 'number' ?
                          <DecimalsFormat
                            value={value}
                            prefix={currency_symbol}
                            noTooltip={true}
                            className="uppercase"
                          /> :
                          <span className="text-slate-400 dark:text-slate-500">
                            -
                          </span>
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-end text-right',
                },
                {
                  Header: 'By Asset',
                  accessor: 'liquidity_by_assets',
                  sortType: (a, b) => a.original.total_value > b.original.total_value ?  1 : -1,
                  Cell: props => {
                    const {
                      value,
                      row,
                    } = { ...props }

                    const {
                      liquidity_utilization_by_assets,
                    } = { ...row.original }

                    return (
                      <div className="grid grid-cols-2 gap-2">
                        {toArray(value)
                          .map((v, i) => {
                            const {
                              asset,
                              value,
                            } = { ...v }

                            const utilization = toArray(liquidity_utilization_by_assets).find(d => d.asset === asset)?.value

                            const asset_data = getAsset(asset, assets_data)

                            const {
                              symbol,
                              image,
                            } = { ...asset_data }

                            return (
                              <div
                                key={i}
                                className="flex items-start space-x-2 mt-0.5"
                              >
                                <Image
                                  src={image}
                                  width={18}
                                  height={18}
                                  className="rounded-full"
                                />
                                <div className="flex flex-col space-y-0.5">
                                  <span className="text-xs font-semibold">
                                    {symbol}
                                  </span>
                                  <div className="flex flex-col">
                                    <div className="h-4 flex items-center space-x-1">
                                      <span className="text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                        Liquidity:
                                      </span>
                                      <DecimalsFormat
                                        value={value}
                                        prefix={currency_symbol}
                                        noTooltip={true}
                                        className="uppercase text-2xs font-semibold"
                                      />
                                    </div>
                                    {
                                      raw_volumes &&
                                      (
                                        <div className="h-4 flex items-center space-x-1">
                                          <span className="text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                            Utilization:
                                          </span>
                                          <DecimalsFormat
                                            value={utilization}
                                            noTooltip={true}
                                            className="uppercase text-2xs font-semibold"
                                          />
                                        </div>
                                      )
                                    }
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-start',
                },
                {
                  Header: 'By Chain',
                  accessor: 'liquidity_by_chains',
                  sortType: (a, b) => a.original.total_value > b.original.total_value ?  1 : -1,
                  Cell: props => {
                    const {
                      value,
                      row,
                    } = { ...props }

                    const {
                      liquidity_utilization_by_chains,
                    } = { ...row.original }

                    return (
                      <div className="grid grid-cols-2 gap-2">
                        {toArray(value)
                          .map((v, i) => {
                            const {
                              chain,
                              value,
                            } = { ...v }

                            const utilization = toArray(liquidity_utilization_by_chains).find(d => d.chain === chain)?.value

                            const chain_data = getChain(chain, chains_data)

                            const {
                              name,
                              image,
                            } = { ...chain_data }

                            return (
                              <div
                                key={i}
                                className="flex items-start space-x-2 mt-0.5"
                              >
                                <Image
                                  src={image}
                                  width={18}
                                  height={18}
                                  className="rounded-full"
                                />
                                <div className="flex flex-col space-y-0.5">
                                  <span className="text-xs font-semibold">
                                    {name}
                                  </span>
                                  <div className="flex flex-col">
                                    <div className="h-4 flex items-center space-x-1">
                                      <span className="text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                        Liquidity:
                                      </span>
                                      <DecimalsFormat
                                        value={value}
                                        prefix={currency_symbol}
                                        noTooltip={true}
                                        className="uppercase text-2xs font-semibold"
                                      />
                                    </div>
                                    {
                                      raw_volumes &&
                                      (
                                        <div className="h-4 flex items-center space-x-1">
                                          <span className="text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                            Utilization:
                                          </span>
                                          <DecimalsFormat
                                            value={utilization}
                                            noTooltip={true}
                                            className="uppercase text-2xs font-semibold"
                                          />
                                        </div>
                                      )
                                    }
                                  </div>
                                </div>
                              </div>
                            )
                          })
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-start',
                },
                {
                  Header: 'Transfers',
                  accessor: 'total_transfers',
                  sortType: (a, b) => a.original.total_transfers > b.original.total_transfers ? 1 : -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className="text-base font-bold text-right">
                        {typeof value === 'number' ?
                          <DecimalsFormat
                            value={value}
                            className="uppercase"
                          /> :
                          <span className="text-slate-400 dark:text-slate-500">
                            -
                          </span>
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-end text-right',
                },
                {
                  Header: 'Volume',
                  accessor: 'total_volume',
                  sortType: (a, b) => a.original.total_volume > b.original.total_volume ? 1 : -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className="text-base font-bold text-right">
                        {raw_volumes ?
                          typeof value === 'number' ?
                            <DecimalsFormat
                              value={value}
                              prefix={currency_symbol}
                              className="uppercase"
                            /> :
                            <span className="text-slate-400 dark:text-slate-500">
                              -
                            </span> :
                            <div className="flex justify-end mt-1">
                              <TailSpin
                                width="18"
                                height="18"
                                color={loaderColor(theme)}
                              />
                            </div>
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-end text-right',
                },
                {
                  Header: 'Fee',
                  accessor: 'total_fee',
                  sortType: (a, b) => a.original.total_fee > b.original.total_fee ? 1 : -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className="text-base font-semibold text-right">
                        {typeof value === 'number' ?
                          <DecimalsFormat
                            value={value}
                            prefix={currency_symbol}
                            className="uppercase"
                          /> :
                          <span className="text-slate-400 dark:text-slate-500">
                            -
                          </span>
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-end text-right',
                },
                {
                  Header: 'Supported Chains',
                  accessor: 'supported_chains',
                  sortType: (a, b) => a.original.supported_chains?.length > b.original.supported_chains?.length ? 1 : -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className={`xl:w-${value?.length > 5 ? '56' : '32'} flex flex-wrap items-center justify-end ml-auto`}>
                        {
                          value?.length > 0 ?
                            value
                              .map((id, i) => {
                                const {
                                  name,
                                  image,
                                } = { ...getChain(id, chains_data) }

                                return (
                                  image &&
                                  (
                                    <div
                                      key={i}
                                      title={name}
                                      className="mr-1"
                                    >
                                      <Image
                                        src={image}
                                        width={24}
                                        height={24}
                                        className="rounded-full"
                                      />
                                    </div>
                                  )
                                )
                              })
                              .filter(c => c) :
                            <span className="text-slate-400 dark:text-slate-500">
                              No chains supported
                            </span>
                        }
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap justify-end text-right',
                },
              ]
              .filter(c => !mode ? !['liquidity_by_assets', 'liquidity_by_chains', 'total_transfers', 'total_fee'].includes(c.accessor) : !['total_transfers', 'total_fee'].includes(c.accessor))
            }
            data={routers}
            noPagination={routers.length <= 10}
            defaultPageSize={50}
            className="no-border"
          /> :
          <div className="flex items-center m-3">
            <TailSpin
              width="32"
              height="32"
              color={loaderColor(theme)}
            />
          </div>
        }
      </div>
    </>
  )
}