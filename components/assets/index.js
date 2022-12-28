import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { constants } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'

import Image from '../image'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import Datatable from '../datatable'
import AddToken from '../add-token'
import Copy from '../copy'

import { chainName } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    chains,
    assets,
  } = useSelector(state =>
    (
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

  const chain_data = (chains_data || [])
    .find(c =>
      c?.id === chainSelect
    )
  const {
    chain_id,
  } = { ...chain_data }

  const _assets_data =
    assets_data ?
      assets_data
        .filter(a =>
          !assetSelect ||
          a?.id === assetSelect
        )
        .flatMap(a =>
          (a?.contracts || [])
            .filter(c =>
              (
                !chain_data ||
                c?.chain_id === chain_id
              ) &&
              (chains_data || [])
                .findIndex(_c =>
                  _c?.chain_id === c?.chain_id
                ) > -1
            )
            .map((c, i) => {
              let asset_data = {
                ...a,
                ...c,
                i,
                chain_data:
                  (chains_data || [])
                    .find(_c =>
                      _c?.chain_id === c?.chain_id
                    ),
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

              const contract_addresses =
                [
                  next_asset?.contract_address,
                  contract_address,
                ]
                .filter(a => a)

              let liquidity =
                !chain &&
                (data || [])
                  .find(d =>
                    d?.chain_id === chain_id &&
                    contract_addresses
                      .findIndex(a =>
                        equals_ignore_case(
                          d?.contract_address,
                          a,
                        )
                      ) > -1
                  )

              if (
                next_asset &&
                equals_ignore_case(
                  next_asset.contract_address,
                  liquidity?.contract_address,
                )
              ) {
                asset_data = {
                  ...asset_data,
                  ...next_asset,
                }

                delete asset_data.next_asset
              }

              const amount =
                data ?
                  chain ?
                    _.sumBy(
                      (data || [])
                        .filter(d =>
                          d?.chain_id === chain_id &&
                          contract_addresses
                            .findIndex(a =>
                              equals_ignore_case(
                                d?.contract_address,
                                a,
                              )
                            ) > -1
                        ),
                      'amount',
                    ) :
                    liquidity?.amount ||
                    0 :
                  null

              const value =
                typeof amount === 'number' ?
                  amount *
                  (
                    price ||
                    0
                  ) :
                  null

              return {
                ...asset_data,
                amount,
                value,
              }
            })
        ) :
      null

  return (
    <div className="space-y-2 mb-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="uppercase tracking-wider text-sm font-medium">
          Liquidity
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
      {_assets_data ?
        <Datatable
          columns={
            [
              {
                Header: '#',
                accessor: 'i',
                sortType: (a, b) =>
                  a.original.i > b.original.i ?
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
                Header: 'Asset',
                accessor: 'symbol',
                sortType: (a, b) =>
                  a.original.symbol > b.original.symbol ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    value,
                  } = { ...props }
                  const {
                    name,
                    image,
                  } = { ...props.row.original }

                  return (
                    <div className="min-w-max flex items-start space-x-2 -mt-0.5">
                      {
                        image &&
                        (
                          <Image
                            src={image}
                            alt=""
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
                    value,
                  } = { ...props }
                  const {
                    chain_data,
                  } = { ...props.row.original }
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
                                  alt=""
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
                          token_data={props.row.original}
                        />
                      </div>
                    )
                  )
                },
              },
              {
                Header: 'Chain',
                accessor: 'chain_data.name',
                sortType: (a, b) =>
                  chainName(a.original.chain) > chainName(b.original.chain_data) ?
                    1 :
                    -1,
                Cell: props => {
                  const {
                    value,
                  } = { ...props }
                  const {
                    chain_data,
                  } = { ...props.row.original }
                  const {
                    id,
                    image,
                  } = { ...chain_data }

                  return (
                    <Link href={`/${id || ''}`}>
                      <a className="min-w-max flex items-center space-x-2">
                        {
                          image &&
                          (
                            <Image
                              src={image}
                              alt=""
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          )
                        }
                        <div className="text-sm font-semibold">
                          {value}
                        </div>
                      </a>
                    </Link>
                  )
                },
              },
              {
                Header: 'Liquidity',
                accessor: 'amount',
                sortType: (a, b) =>
                  a.original.value > b.original.value ?
                    1 :
                    a.original.value < b.original.value ?
                      -1 :
                      a.original.amount > b.original.amount ?
                        1 :
                        -1,
                Cell: props => {
                  const {
                    value,
                  } = { ...props.row.original }

                  return (
                    typeof props.value === 'number' ?
                      <div className="flex flex-col items-end space-y-0.5 -mt-0.5">
                        <span className="uppercase text-base font-bold">
                          {number_format(
                            props.value,
                            props.value > 1000000 ?
                              '0,0.00a' :
                              props.value > 1000 ?
                                '0,0' :
                                '0,0.00',
                          )}
                        </span>
                        <span className="uppercase text-slate-400 dark:text-slate-500 text-xs font-semibold">
                          {currency_symbol}
                          {number_format(
                            value,
                            value > 100000 ?
                              '0,0.00a' :
                              value > 1000 ?
                                '0,0' :
                                '0,0.00',
                          )}
                        </span>
                      </div> :
                      <div className="flex items-center justify-end">
                        <TailSpin
                          color={loader_color(theme)}
                          width="24"
                          height="24"
                        />
                      </div>
                  )
                },
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
            ]
            .filter(c =>
              !chain ||
              ![
                'chain_data.name',
              ].includes(c.accessor)
            )
          }
          data={_assets_data}
          noPagination={_assets_data.length <= 10}
          defaultPageSize={10}
          className="no-border"
        /> :
        <TailSpin
          color={loader_color(theme)}
          width="32"
          height="32"
        />
      }
    </div>
  )
}