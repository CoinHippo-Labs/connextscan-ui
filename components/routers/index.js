import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { BigNumber, utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'

import Metrics from '../metrics'
import Image from '../image'
import Datatable from '../datatable'
import Copy from '../copy'
import EnsProfile from '../ens-profile'

import { daily_transfer_metrics, daily_transfer_volume } from '../../lib/api/metrics'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

export default () => {
  const {
    preferences,
    chains,
    assets,
    asset_balances,
    dev,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        asset_balances:
        state.asset_balances,
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
    asset_balances_data,
  } = { ...asset_balances }

  const [data, setData] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (
        sdk &&
        chains_data &&
        assets_data
      ) {
        let volumes = await daily_transfer_volume()

        volumes = (volumes || [])
          .map(v => {
            const {
              transfer_date,
              origin_chain,
              destination_chain,
              asset,
              volume,
            } = { ...v }

            const origin_chain_data = chains_data.find(c => c?.domain_id === origin_chain)
            const destination_chain_data = chains_data.find(c => c?.domain_id === destination_chain)

            let asset_data = assets_data.find(a =>
              a?.contracts?.findIndex(c =>
                c?.chain_id === origin_chain_data?.chain_id &&
                equals_ignore_case(c?.contract_address, asset)
              ) > -1
            )

            asset_data = {
              ...asset_data,
              ...asset_data?.contracts?.find(c =>
                c?.chain_id === origin_chain_data?.chain_id &&
                equals_ignore_case(c?.contract_address, asset)
              ),
            }

            if (asset_data?.contracts) {
              delete asset_data.contracts
            }

            const {
              decimals,
              price,
            } = { ...asset_data }

            const amount = Number(
              utils.formatUnits(
                BigNumber.from(
                  BigInt(volume || 0).toString()
                ),
                decimals || 18,
              )
            )

            return {
              ...v,
              origin_chain_data,
              destination_chain_data,
              asset_data,
              amount,
              volume: amount *
                (price || 0),
            }
          })

        let transfers = await daily_transfer_metrics()

        transfers = (transfers || [])
          .map(t => {
            const {
              transfer_date,
              origin_chain,
              destination_chain,
            } = { ...t }

            const origin_chain_data = chains_data.find(c => c?.domain_id === origin_chain)
            const destination_chain_data = chains_data.find(c => c?.domain_id === destination_chain)

            return {
              ...t,
              origin_chain_data,
              destination_chain_data,
            }
          })

        setData({
          volumes: _.orderBy(
            Object.entries(
              _.groupBy(
                volumes,
                'router',
              )
            )
            .map(([k, v]) => {
              return {
                router: k,
                volume: _.sumBy(
                  v,
                  'volume',
                ),
              }
            }),
            ['volume'],
            ['desc'],
          ),
          transfers: _.orderBy(
            Object.entries(
              _.groupBy(
                transfers,
                'router',
              )
            )
            .map(([k, v]) => {
              return {
                router: k,
                transfers: _.sumBy(
                  v,
                  'transfer_count',
                ),
              }
            }),
            ['transfers'],
            ['desc'],
          ),
        })
      }
    }

    getData()
  }, [sdk, chains_data, assets_data])

  const routers = _.orderBy(
    Object.entries(
      _.groupBy(
        Object.values({ ...asset_balances_data })
          .flatMap(a => a),
        'router_address',
      )
    )
    .map(([k, v]) => {
      return {
        router_address: k,
        assets: _.orderBy(
          v,
          ['value'],
          ['desc'],
        ),
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
        total_value: _.sumBy(
          assets,
          'value',
        ),
        total_volume: _.sumBy(
          (volumes || [])
            .filter(d => equals_ignore_case(d?.router, router_address)),
          'volume',
        ),
        total_transfers: _.sumBy(
          (transfers || [])
            .filter(d => equals_ignore_case(d?.router, router_address)),
          'transfers',
        ),
        // total_fee: 33.33,
        supported_chains: _.uniq(
          assets?.map(a => a?.chain_id)
        ),
      }
    }),
    ['total_value'],
    ['desc'],
  )

  const metrics = asset_balances_data &&
    {
      liquidity: _.sumBy(
        routers,
        'total_value',
      ),
      volume: _.sumBy(
        routers,
        'total_volume',
      ),
      transfers: _.sumBy(
        routers,
        'total_transfers',
      ),
      // fee: 33.33,
      supported_chains: _.uniq(
        routers.flatMap(r => r?.supported_chains)
      ),
    }

  return (
    <>
      <div className="mb-6">
        <Metrics
          data={metrics}
        />
      </div>
      <div className="my-4 sm:my-6">
        {asset_balances_data ?
          <Datatable
            columns={
              [
                {
                  Header: '#',
                  accessor: 'i',
                  sortType: (a, b) => a.original.i > b.original.i ?
                    1 :
                    -1,
                  Cell: props => (
                    <span className="font-semibold">
                      {number_format(
                        (props.flatRows?.indexOf(props.row) > -1 ?
                          props.flatRows.indexOf(props.row) :
                          props.value
                        ) + 1,
                        '0,0',
                      )}
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

                    return value &&
                      (
                        <div className="flex items-center space-x-1">
                          <Link href={`/router/${value}`}>
                            <a>
                              <EnsProfile
                                address={value}
                                no_copy={true}
                                fallback={
                                  value &&
                                  (
                                    <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                                      <span className="xl:hidden">
                                        {ellipse(
                                          value,
                                          8,
                                        )}
                                      </span>
                                      <span className="hidden xl:block">
                                        {ellipse(
                                          value,
                                          12,
                                        )}
                                      </span>
                                    </span>
                                  )
                                }
                              />
                            </a>
                          </Link>
                          <Copy
                            value={value}
                          />
                        </div>
                      )
                  },
                },
                {
                  Header: 'Liquidity',
                  accessor: 'total_value',
                  sortType: (a, b) => a.original.total_value > b.original.total_value ?
                    1 :
                    -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className="text-base font-bold text-right">
                        {typeof value === 'number' ?
                          <span className="uppercase">
                            {currency_symbol}
                            {number_format(
                              value,
                              value > 1000000 ?
                                '0,0.00a' :
                                value > 10000 ?
                                  '0,0' :
                                  '0,0.00',
                            )}
                          </span> :
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
                  Header: 'Transfers',
                  accessor: 'total_transfers',
                  sortType: (a, b) => a.original.total_transfers > b.original.total_transfers ?
                    1 :
                    -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className="text-base font-bold text-right">
                        {typeof value === 'number' ?
                          <span className="uppercase">
                            {number_format(
                              value,
                              value > 100000 ?
                                '0,0.00a' :
                                '0,0',
                              )}
                          </span> :
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
                  sortType: (a, b) => a.original.total_volume > b.original.total_volume ?
                    1 :
                    -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className="text-base font-bold text-right">
                        {typeof value === 'number' ?
                          <span className="uppercase">
                            {currency_symbol}
                            {number_format(
                              value,
                              value > 10000000 ?
                                '0,0.00a' :
                                value > 100000 ?
                                  '0,0' :
                                  '0,0.00',
                            )}
                          </span> :
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
                  Header: 'Fee',
                  accessor: 'total_fee',
                  sortType: (a, b) => a.original.total_fee > b.original.total_fee ?
                    1 :
                    -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className="text-base font-semibold text-right">
                        {typeof value === 'number' ?
                          <span className="uppercase">
                            {currency_symbol}
                            {number_format(
                              value,
                              value > 100000 ?
                                '0,0.00a' :
                                value > 1000 ?
                                  '0,0' :
                                  '0,0.00',
                            )}
                          </span> :
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
                  sortType: (a, b) => a.original.supported_chains?.length > b.original.supported_chains?.length ?
                    1 :
                    -1,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      <div className={`xl:w-${value?.length > 5 ? '56' : '32'} flex flex-wrap items-center justify-end ml-auto`}>
                        {value?.length > 0 ?
                          value
                            .map((id, i) => {
                              const {
                                name,
                                image,
                              } = { ...chains_data?.find(c => c?.chain_id === id) }

                              return image &&
                                (
                                  <div
                                    key={i}
                                    title={name}
                                    className="mr-1"
                                  >
                                    <Image
                                      src={image}
                                      alt=""
                                      width={24}
                                      height={24}
                                      className="rounded-full"
                                    />
                                  </div>
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
              .filter(c =>
                !['total_fee'].includes(c.accessor)
              )
            }
            data={routers}
            noPagination={routers.length <= 10}
            defaultPageSize={50}
            className="no-border"
          /> :
          <div className="h-32 flex items-center justify-center">
            <TailSpin
              color={loader_color(theme)}
              width="32"
              height="32"
            />
          </div>
        }
      </div>
    </>
  )
}