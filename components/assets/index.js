import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { constants } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'

import AddToken from '../add-token'
import Copy from '../copy'
import Datatable from '../datatable'
import DecimalsFormat from '../decimals-format'
import Image from '../image'
import SelectChain from '../select-options/chain'
import SelectAsset from '../select-options/asset'

import { currency_symbol } from '../../lib/object/currency'
import { getChain, chainName } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { toArray, ellipse, equalsIgnoreCase, loaderColor } from '../../lib/utils'

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    chains,
    assets,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
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

  const _assets_data =
    toArray(getAsset(assetSelect, assets_data, chain_id, undefined, undefined, false, false, false, true))
      .flatMap(a =>
        toArray(a?.contracts)
          .filter(c =>
            getChain(c?.chain_id, chains_data) &&
            (
              !chain_data ||
              getContract(c.chain_id, a.contracts)?.chain_id === chain_id
            )
          )
          .map((c, i) => {
            let asset_data = {
              ...a,
              ...c,
              i,
              chain_data: getChain(c?.chain_id, chains_data),
            }

            if (asset_data.contracts) {
              delete asset_data.contracts
            }

            const {
              chain_id,
              contract_address,
              next_asset,
              price,
            } = { ...asset_data }

            const contract_addresses = toArray(_.concat(next_asset?.contract_address, contract_address))

            const _data =
              toArray(data)
                .filter(d =>
                  d?.chain_id === chain_id &&
                  contract_addresses
                    .findIndex(a =>
                      equalsIgnoreCase(
                        d?.contract_address,
                        a,
                      )
                    ) > -1
                )

            const contract_data = _.head(_data)

            if (
              next_asset &&
              (
                !contract_data?.contract_address ||
                equalsIgnoreCase(
                  next_asset.contract_address,
                  contract_data.contract_address,
                )
              )
            ) {
              asset_data = {
                ...asset_data,
                ...next_asset,
              }

              delete asset_data.next_asset
            }

            const amount = _.sumBy(_data, 'amount')
            const value = amount * (price || 0)

            return {
              ...asset_data,
              amount,
              value,
            }
          })
      )

  return (
    <div className="space-y-2 mb-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="whitespace-nowrap uppercase text-sm font-semibold">
          Routers Liquidity
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
      {assets_data ?
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
                Header: 'Asset',
                accessor: 'symbol',
                sortType: (a, b) => a.original.symbol > b.original.symbol ? 1 : -1,
                Cell: props => {
                  const {
                    row,
                    value,
                  } = { ...props }

                  const {
                    name,
                    image,
                  } = { ...row.original }

                  return (
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
                          {name}
                        </div>
                      </div>
                    </div>
                  )
                },
              },
              {
                Header: 'Address',
                accessor: 'contract_address',
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
                        <AddToken
                          token_data={row.original}
                        />
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
                accessor: 'amount',
                sortType: (a, b) => a.original.value > b.original.value ? 1 : a.original.value < b.original.value ? -1 : a.original.amount > b.original.amount ? 1 : -1,
                Cell: props => {
                  const {
                    row,
                  } = { ...props }

                  const {
                    amount,
                    value,
                  } = { ...row.original }

                  return (
                    typeof amount === 'number' ?
                      <div className="flex flex-col items-end space-y-0.5 -mt-0.5">
                        <DecimalsFormat
                          value={amount}
                          className="uppercase text-base font-bold"
                        />
                        <DecimalsFormat
                          value={value}
                          prefix={currency_symbol}
                          className="uppercase text-slate-400 dark:text-slate-500 text-xs font-semibold"
                        />
                      </div> :
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
          data={_assets_data}
          noPagination={_assets_data.length <= 10}
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