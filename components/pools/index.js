import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { constants } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'

import Copy from '../copy'
import Datatable from '../datatable'
import DecimalsFormat from '../decimals-format'
import Image from '../image'
import SelectChain from '../select-options/chain'
import SelectAsset from '../select-options/asset'

import { currency_symbol } from '../../lib/object/currency'
import { getChain, chainName } from '../../lib/object/chain'
import { toArray, ellipse, loaderColor } from '../../lib/utils'

export default () => {
  const {
    preferences,
    chains,
    assets,
    pools,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        pools: state.pools,
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
    pools_data,
  } = { ...pools }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    chain,
  } = { ...query }

  const [chainSelect, setChainSelect] = useState('')
  const [assetSelect, setAssetSelect] = useState('')

  useEffect(
    () => {
      if (chain) {
        setChainSelect(chain)
      }
    },
    [chain],
  )

  const chain_data = getChain(chainSelect, chains_data)

  const {
    chain_id,
  } = { ...chain_data }

  const _pools_data =
    _.orderBy(
      toArray(pools_data)
        .filter(d =>
          d.chain_id === chain_id &&
          (
            !assetSelect ||
            d.asset_data?.id === assetSelect
          )
        )
        .map((d, i) => {
          return {
            ...d,
            i,
          }
        }),
      ['tvl'],
      ['desc'],
    )

  return (
    <div className="space-y-2 mb-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="whitespace-nowrap uppercase text-sm font-semibold">
          Pools Liquidity
        </div>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0 mb-4 sm:mb-0">
          {
            !chain &&
            (
              <SelectChain
                value={chainSelect}
                onSelect={c => setChainSelect(c)}
              />
            )
          }
          <SelectAsset
            value={assetSelect}
            onSelect={a => setAssetSelect(a)}
            chain={chainSelect}
          />
        </div>
      </div>
      {pools_data ?
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
                Header: 'Pool',
                accessor: 'name',
                sortType: (a, b) => a.original.name > b.original.name ? 1 : -1,
                Cell: props => {
                  const {
                    row,
                    value,
                  } = { ...props }

                  const {
                    symbol,
                    chain_data,
                    asset_data,
                  } = { ...row.original }

                  const {
                    image,
                  } = { ...asset_data }

                  return (
                    <a
                      href={`${process.env.NEXT_PUBLIC_BRIDGE_URL}/pool/${asset_data?.symbol?.toUpperCase()}-on-${chain_data?.id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <div className="min-w-max flex items-start space-x-2 -mt-0.5">
                        {
                          image &&
                          (
                            <Image
                              src={image}
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          )
                        }
                        <div className="space-y-0.5">
                          <div className="text-base font-semibold">
                            {value}
                          </div>
                          <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs">
                            {symbol}
                          </div>
                        </div>
                      </div>
                    </a>
                  )
                },
              },
              {
                Header: 'Address',
                accessor: 'lpTokenAddress',
                disableSortBy: true,
                Cell: props => {
                  const {
                    row,
                    value,
                  } = { ...props }

                  const {
                    chain_data,
                  } = { ...row.original }

                  const {
                    explorer,
                  } = { ...chain_data }

                  const {
                    url,
                    icon,
                  } = { ...explorer }

                  return (
                    value &&
                    (
                      <div className="min-w-max flex items-center space-x-1.5 -mt-1">
                        <Copy
                          size={20}
                          value={value}
                          title={
                            chain &&
                            (
                              <span className="text-slate-400 dark:text-slate-200 text-sm">
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
                        {
                          url &&
                          (
                            <a
                              href={`${url}${explorer[`contract${value === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', value)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center text-blue-600 dark:text-white"
                            >
                              {icon ?
                                <Image
                                  src={icon}
                                  width={20}
                                  height={20}
                                  className="rounded-full opacity-60 hover:opacity-100"
                                /> :
                                <TiArrowRight
                                  size={20}
                                  className="transform -rotate-45"
                                />
                              }
                            </a>
                          )
                        }
                      </div>
                    )
                  )
                },
              },
              {
                Header: 'Chain',
                accessor: 'chain_data.name',
                sortType: (a, b) => chainName(a.original.chain_data) > chainName(b.original.chain_data) ? 1 : -1,
                Cell: props => {
                  const {
                    row,
                    value,
                  } = { ...props }

                  const {
                    chain_data,
                  } = { ...row.original }

                  const {
                    id,
                    image,
                  } = { ...chain_data }

                  return (
                    <Link href={`/${id || ''}`}>
                      <div className="min-w-max flex items-center space-x-2">
                        {
                          image &&
                          (
                            <Image
                              src={image}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          )
                        }
                        <div className="text-sm font-semibold">
                          {value}
                        </div>
                      </div>
                    </Link>
                  )
                },
              },
              {
                Header: 'Liquidity',
                accessor: 'tvl',
                sortType: (a, b) => a.original.tvl > b.original.tvl ? 1 : -1,
                Cell: props => {
                  const {
                    row,
                    value,
                  } = { ...props }

                  const {
                    chain_data,
                    asset_data,
                  } = { ...row.original }

                  return (
                    typeof value === 'number' ?
                      <a
                        href={`${process.env.NEXT_PUBLIC_BRIDGE_URL}/pool/${asset_data?.symbol?.toUpperCase()}-on-${chain_data?.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        <div className="flex flex-col items-end space-y-0.5 -mt-0.5">
                          <DecimalsFormat
                            value={value}
                            prefix={currency_symbol}
                            noTooltip={true}
                            className="uppercase text-base font-bold"
                          />
                        </div>
                      </a> :
                      <div className="flex items-center justify-end">
                        <TailSpin
                          width="24"
                          height="24"
                          color={loaderColor(theme)}
                        />
                      </div>
                  )
                },
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
            ]
            .filter(c => !chain || !['chain_data.name'].includes(c.accessor))
          }
          size="small"
          data={_pools_data}
          noPagination={_pools_data.length <= 10}
          defaultPageSize={10}
          className="no-border"
        /> :
        <TailSpin
          width="32"
          height="32"
          color={loaderColor(theme)}
        />
      }
    </div>
  )
}