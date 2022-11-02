import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { XTransferStatus } from '@connext/nxtp-utils'
import { TailSpin } from 'react-loader-spinner'
import { HiCheckCircle } from 'react-icons/hi'

import Image from '../image'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import SelectStatus from '../select/status'
import Datatable from '../datatable'
import TimeSpent from '../time-spent'
import EnsProfile from '../ens-profile'
import AddToken from '../add-token'
import Copy from '../copy'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

const ROUTER_FEE_PERCENT =
  Number(
    process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT
  ) ||
  0.05

const LIMIT = 100

export default () => {
  const {
    preferences,
    chains,
    assets,
    dev,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
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

  const router = useRouter()
  const {
    pathname,
    query,
  } = { ...router }
  const {
    address,
  } = { ...query }

  const [data, setData] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [fromChainSelect, setFromChainSelect] = useState('')
  const [toChainSelect, setToChainSelect] = useState('')
  const [assetSelect, setAssetSelect] = useState('')
  const [statusSelect, setStatusSelect] = useState('')

  useEffect(() => {
    if (
      fromChainSelect &&
      fromChainSelect === toChainSelect
    ) {
      setToChainSelect('')
    }
  }, [fromChainSelect])

  useEffect(() => {
    if (
      toChainSelect &&
      toChainSelect === fromChainSelect
    ) {
      setFromChainSelect('')
    }
  }, [toChainSelect])

  useEffect(() => {
    const triggering = is_interval => {
      if (sdk) {
        setFetchTrigger(
          is_interval ?
            moment()
              .valueOf() :
            typeof fetchTrigger === 'number' ?
              null :
              0
        )
      }
    }

    triggering()

    const interval =
      setInterval(() =>
        triggering(true),
        0.25 * 60 * 1000,
      )

    return () => clearInterval(interval)
  }, [sdk, pathname, address, statusSelect])

  useEffect(() => {
    const getData = async () => {
      if (sdk) {
        setFetching(true)

        if (!fetchTrigger) {
          setData(null)
          setOffet(0)
        }

        let response

        const status =
          statusSelect ||
          undefined

        const _data = !fetchTrigger ?
          [] :
          data ||
          []

        const limit = LIMIT

        const offset =
          fetchTrigger === true ||
          fetchTrigger === 1 ?
            _data.length :
            0

        switch (pathname) {
          case '/address/[address]':
            try {
              if (address) {
                response = await sdk.nxtpSdkUtils.getTransfersByUser(
                  {
                    userAddress: address,
                    status,
                    range: {
                      limit,
                      offset,
                    },
                  },
                )
              }
            } catch (error) {}
            break
          case '/router/[address]':
            try {
              if (address) {
                response = await sdk.nxtpSdkUtils.getTransfersByRouter(
                  {
                    routerAddress: address,
                    status,
                    range: {
                      limit,
                      offset,
                    },
                  },
                )
              }
            } catch (error) {}
            break
          default:
            try {
              if (status) {
                response = await sdk.nxtpSdkUtils.getTransfersByStatus(
                  {
                    status,
                    range: {
                      limit,
                      offset,
                    },
                  },
                )
              }
              else {
                response = await sdk.nxtpSdkUtils.getTransfers(
                  {
                    range: {
                      limit,
                      offset,
                    },
                  },
                )
              }
            } catch (error) {}
            break
        }

        if (Array.isArray(response)) {
          response =
            _.orderBy(
              _.uniqBy(
                _.concat(
                  _data,
                  response,
                ),
                'transfer_id'
              ),
              ['xcall_timestamp'],
              ['desc'],
            )

          response = response
            .map(t => {
              const source_chain_data = chains_data?.find(c =>
                c?.chain_id === Number(t?.origin_chain) ||
                c?.domain_id === t?.origin_domain
              )
              const source_asset_data = assets_data?.find(a =>
                a?.contracts?.findIndex(c =>
                  c?.chain_id === source_chain_data?.chain_id &&
                  [
                    t?.origin_transacting_asset,
                    t?.origin_bridged_asset,
                  ].findIndex(_a =>
                    equals_ignore_case(_a, c?.contract_address)
                  ) > -1
                ) > -1
              )
              const source_contract_data = source_asset_data?.contracts?.find(c =>
                c?.chain_id === source_chain_data?.chain_id,
              )

              const destination_chain_data = chains_data?.find(c =>
                c?.chain_id === Number(t?.destination_chain) ||
                c?.domain_id === t?.destination_domain
              )
              const destination_asset_data = assets_data?.find(a =>
                a?.contracts?.findIndex(c =>
                  c?.chain_id === destination_chain_data?.chain_id &&
                  [
                    t?.destination_transacting_asset,
                    t?.destination_local_asset,
                  ].findIndex(_a =>
                    equals_ignore_case(_a, c?.contract_address)
                  ) > -1
                ) > -1
              )
              const destination_contract_data = destination_asset_data?.contracts?.find(c =>
                c?.chain_id === destination_chain_data?.chain_id,
              )

              return {
                ...t,
                source_chain_data,
                destination_chain_data,
                source_asset_data: {
                  ...source_asset_data,
                  ...source_contract_data,
                },
                destination_asset_data: {
                  ...destination_asset_data,
                  ...destination_contract_data,
                },
                pending:
                  ![
                    XTransferStatus.Executed,
                    XTransferStatus.CompletedFast,
                    XTransferStatus.CompletedSlow,
                  ].includes(t?.status),
              }
            })
            .map(t => {
              const {
                source_asset_data,
                destination_asset_data,
                origin_transacting_amount,
                origin_bridged_amount,
                destination_transacting_amount,
                destination_local_amount,
              } = { ...t }

              const source_amount =
                _.head(
                  [
                    origin_transacting_amount,
                    origin_bridged_amount,
                  ]
                  .map(a =>
                    [
                      'number',
                      'string',
                    ].includes(typeof a) &&
                    Number(
                      utils.formatUnits(
                        BigNumber.from(
                          BigInt(a)
                            .toString()
                        ),
                        source_asset_data?.decimals ||
                        18,
                      )
                    )
                  )
                  .filter(a => a)
                )

              const destination_amount =
                _.head(
                  [
                    destination_transacting_amount,
                    // destination_local_amount,
                  ]
                  .map(a =>
                    [
                      'number',
                      'string',
                    ].includes(typeof a) &&
                    Number(
                      utils.formatUnits(
                        BigNumber.from(
                          BigInt(a)
                            .toString()
                        ),
                        destination_asset_data?.decimals ||
                        18,
                      )
                    )
                  )
                  .filter(a => a)
                ) ||
                source_amount *
                (
                  1 -
                  ROUTER_FEE_PERCENT / 100
                )

              return {
                ...t,
                source_asset_data: {
                  ...source_asset_data,
                  amount: source_amount,
                },
                destination_asset_data: {
                  ...destination_asset_data,
                  amount: destination_amount,
                },
              }
            })

          setData(response)
        }
        else if (!fetchTrigger) {
          setData([])
        }

        setFetching(false)
      }
    }

    getData()
  }, [fetchTrigger])

  const source_chain_data = chains_data?.find(c =>
    c?.id === fromChainSelect
  )
  const destination_chain_data = chains_data?.find(c =>
    c?.id === toChainSelect
  )

  const asset_data = assets_data?.find(a =>
    [
      a?.source_asset_data?.id,
      a?.destination_asset_data?.id,
    ].includes(a?.id)
  )

  const data_filtered = data?.filter(t =>
    (
      !source_chain_data ||
      source_chain_data?.id === t?.source_chain_data?.id
    ) &&
    (
      !destination_chain_data ||
      destination_chain_data?.id === t?.destination_chain_data?.id
    ) &&
    (
      !asset_data ||
      [
        t?.source_asset_data?.id,
        t?.destination_asset_data?.id,
      ].includes(asset_data?.id)
    )
  )

  return (
    <div className="space-y-2 mb-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="uppercase tracking-wider text-sm font-medium">
          Latest Transfers
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 space-x-0 sm:space-x-2 mt-2 sm:mt-0 mb-4 sm:mb-0">
          <div className="flex items-center space-x-2">
            <span className="font-semibold">
              From
            </span>
            <SelectChain
              value={fromChainSelect}
              onSelect={c => setFromChainSelect(c)}
            />
            <span className="font-semibold">
              To
            </span>
            <SelectChain
              value={toChainSelect}
              onSelect={c => setToChainSelect(c)}
            />
          </div>
          <div className="flex items-center space-x-2 sm:space-x-2">
            <SelectAsset
              value={assetSelect}
              onSelect={a => setAssetSelect(a)}
              chain={[
                fromChainSelect,
                toChainSelect,
              ]}
            />
            <SelectStatus
              value={statusSelect}
              onSelect={s => setStatusSelect(s)}
            />
          </div>
        </div>
      </div>
      {data_filtered ?
        <div className={`grid space-y-2 gap-${data_filtered.length <= 10 ? 4 : 2}`}>
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
                  Header: 'Transfer ID',
                  accessor: 'transfer_id',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }
                    const {
                      pending,
                      xcall_timestamp,
                      execute_timestamp,
                      status,
                    } = { ...props.row.original }
                    let {
                      force_slow,
                    } = { ...props.row.original }

                    force_slow =
                      force_slow ||
                      (status || '')
                        .toLowerCase()
                        .includes('slow')

                    return value &&
                      (
                        <div className="flex flex-col items-start space-y-2">
                          <div className="flex items-center space-x-1">
                            <Link href={`/tx/${value}`}>
                              <a className="text-blue-500 dark:text-white font-semibold">
                                <span className="sm:hidden">
                                  {ellipse(
                                    value,
                                    address ?
                                      6 :
                                      8,
                                  )}
                                </span>
                                <span className="hidden sm:block">
                                  {ellipse(
                                    value,
                                    address ?
                                      8 :
                                      12,
                                  )}
                                </span>
                              </a>
                            </Link>
                            <Copy
                              size={20}
                              value={props.value}
                            />
                          </div>
                          {
                            address &&
                            (
                              <div className="flex-col items-start space-y-1">
                                <Link href={`/tx/${value}`}>
                                  <a>
                                    {pending ?
                                      <div className="flex items-center text-blue-500 dark:text-blue-300 space-x-1.5">
                                        <TailSpin
                                          color={loader_color(theme)}
                                          width="16"
                                          height="16"
                                        />
                                        <span className="font-medium">
                                          Processing...
                                        </span>
                                      </div> :
                                      <div className="flex items-center text-green-500 dark:text-green-300 space-x-1">
                                        <HiCheckCircle
                                          size={20}
                                        />
                                        <span className="uppercase font-bold">
                                          Success
                                        </span>
                                      </div>
                                    }
                                  </a>
                                </Link>
                                <TimeSpent
                                  title="Time spent"
                                  from_time={xcall_timestamp}
                                  to_time={execute_timestamp}
                                  className={`${pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'} font-semibold`}
                                />
                                {
                                  force_slow &&
                                  (
                                    <div className="flex items-center space-x-1">
                                      <span className="text-slate-600 dark:text-slate-200 text-xs font-semibold">
                                        Path:
                                      </span>
                                      <span className="text-slate-600 dark:text-slate-200 uppercase text-xs font-bold">
                                        Slow
                                      </span>
                                    </div>
                                  )
                                }
                              </div>
                            )
                          }
                        </div>
                      )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Status',
                  accessor: 'status',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }
                    const {
                      transfer_id,
                      pending,
                      xcall_timestamp,
                      execute_timestamp,
                    } = { ...props.row.original }
                    let {
                      force_slow,
                    } = { ...props.row.original }

                    force_slow =
                      force_slow ||
                      (value || '')
                        .toLowerCase()
                        .includes('slow')

                    return (
                      <div className="flex flex-col items-start space-y-1 mt-0.5">
                        <Link href={`/tx/${transfer_id}`}>
                          <a>
                            {pending ?
                              <div className="flex items-center text-blue-500 dark:text-blue-300 space-x-1.5">
                                <TailSpin
                                  color={loader_color(theme)}
                                  width="16"
                                  height="16"
                                />
                                <span className="font-medium">
                                  Processing...
                                </span>
                              </div> :
                              <div className="flex items-center text-green-500 dark:text-green-300 space-x-1">
                                <HiCheckCircle
                                  size={20}
                                />
                                <span className="uppercase font-bold">
                                  Success
                                </span>
                              </div>
                            }
                          </a>
                        </Link>
                        <TimeSpent
                          title="Time spent"
                          from_time={xcall_timestamp}
                          to_time={execute_timestamp}
                          className={`${pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'} font-semibold`}
                        />
                        {
                          force_slow &&
                          (
                            <div className="flex items-center space-x-1">
                              <span className="text-slate-600 dark:text-slate-200 text-xs font-semibold">
                                Path:
                              </span>
                              <span className="text-slate-600 dark:text-slate-200 uppercase text-xs font-bold">
                                Slow
                              </span>
                            </div>
                          )
                        }
                      </div>
                    )
                  },
                },
                {
                  Header: 'Origin',
                  accessor: 'source_chain_data',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }
                    const {
                      source_asset_data,
                      xcall_caller,
                    } = { ...props.row.original }
                    const {
                      name,
                      image,
                    } = { ...value }
                    const {
                      symbol,
                      amount,
                    } = { ...source_asset_data }

                    return (
                      <div className="space-y-1.5 mb-3">
                        {value ?
                          <div className="flex items-center justify-center sm:justify-start space-x-2">
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
                            <span className="text-sm font-semibold">
                              {name}
                            </span>
                          </div> :
                          <div className="flex items-center justify-center sm:justify-start">
                            <TailSpin
                              color={loader_color(theme)}
                              width="24"
                              height="24"
                            />
                          </div>
                        }
                        <div className="h-7 flex items-center space-x-2">
                          {
                            source_asset_data?.image &&
                            (
                              <Image
                                src={source_asset_data.image}
                                alt=""
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                            )
                          }
                          {
                            amount > 0 &&
                            (
                              <span className="text-xs font-semibold">
                                {number_format(
                                  amount,
                                  '0,0.000000',
                                  true,
                                )}
                              </span>
                            )
                          }
                          {
                            source_asset_data &&
                            (
                              <>
                                {
                                  symbol &&
                                  (
                                    <span className="text-xs font-medium">
                                      {symbol}
                                    </span>
                                  )
                                }
                                {
                                  source_asset_data.contract_address &&
                                  (
                                    <AddToken
                                      token_data={{
                                        ...source_asset_data,
                                      }}
                                    />
                                  )
                                }
                              </>
                            )
                          }
                        </div>
                        {
                          xcall_caller &&
                          (
                            <div className="flex items-center justify-center sm:justify-start space-x-1">
                              <Link href={`/address/${xcall_caller}`}>
                                <a>
                                  <EnsProfile
                                    address={xcall_caller}
                                    no_copy={true}
                                    no_image={true}
                                    fallback={<span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                                      <span className="sm:hidden">
                                        {ellipse(
                                          xcall_caller,
                                          6,
                                        )}
                                      </span>
                                      <span className="hidden sm:block">
                                        {ellipse(
                                          xcall_caller,
                                          8,
                                        )}
                                      </span>
                                    </span>}
                                  />
                                </a>
                              </Link>
                              <Copy
                                value={xcall_caller}
                              />
                            </div>
                          )
                        }
                      </div>
                    )
                  },
                },
                {
                  Header: 'Destination',
                  accessor: 'destination_chain_data',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }
                    const {
                      destination_asset_data,
                      to,
                    } = { ...props.row.original }
                    const {
                      name,
                      image,
                    } = { ...value }
                    const {
                      symbol,
                      amount,
                    } = { ...destination_asset_data }

                    return (
                      <div className="space-y-1.5 mb-3">
                        {value ?
                          <div className="flex items-center justify-center sm:justify-start space-x-2">
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
                            <span className="text-sm font-semibold">
                              {name}
                            </span>
                          </div> :
                          <div className="flex items-center justify-center sm:justify-start">
                            <TailSpin
                              color={loader_color(theme)}
                              width="24"
                              height="24"
                            />
                          </div>
                        }
                        <div className="h-7 flex items-center space-x-2">
                          {
                            destination_asset_data?.image &&
                            (
                              <Image
                                src={destination_asset_data.image}
                                alt=""
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                            )
                          }
                          {
                            amount > 0 &&
                            (
                              <span className="text-xs font-semibold">
                                {number_format(
                                  amount,
                                  '0,0.000000',
                                  true,
                                )}
                              </span>
                            )
                          }
                          {
                            destination_asset_data &&
                            (
                              <>
                                {
                                  symbol &&
                                  (
                                    <span className="text-xs font-medium">
                                      {symbol}
                                    </span>
                                  )
                                }
                                {
                                  destination_asset_data.contract_address &&
                                  (
                                    <AddToken
                                      token_data={{
                                        ...destination_asset_data,
                                      }}
                                    />
                                  )
                                }
                              </>
                            )
                          }
                        </div>
                        {
                          to &&
                          (
                            <div className="flex items-center justify-center sm:justify-start space-x-1">
                              <Link href={`/address/${to}`}>
                                <a>
                                  <EnsProfile
                                    address={to}
                                    no_copy={true}
                                    no_image={true}
                                    fallback={<span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
                                      <span className="sm:hidden">
                                        {ellipse(
                                          to,
                                          6,
                                        )}
                                      </span>
                                      <span className="hidden sm:block">
                                        {ellipse(
                                          to,
                                          8,
                                        )}
                                      </span>
                                    </span>}
                                  />
                                </a>
                              </Link>
                              <Copy
                                value={to}
                              />
                            </div>
                          )
                        }
                      </div>
                    )
                  },
                },
              ]
              .filter(c =>
                !address ||
                ![
                  'status',
                ].includes(c.accessor))
            }
            data={data_filtered}
            noPagination={data_filtered.length <= 10}
            defaultPageSize={address ?
              10 :
              25
            }
            className="no-border"
          />
          {
            data.length > 0 &&
            (
              !fetching ?
                data.length >= LIMIT &&
                (
                  <button
                    onClick={() => {
                      setOffet(data.length)
                      setFetchTrigger(
                        typeof fetchTrigger === 'number' ?
                          true :
                          1
                      )
                    }}
                    className="max-w-min whitespace-nowrap text-slate-400 hover:text-blue-500 dark:text-slate-200 dark:hover:text-blue-400 font-normal hover:font-medium mx-auto"
                  >
                    Load more
                  </button>
                ) :
                <div className="flex justify-center">
                  <TailSpin
                    color={loader_color(theme)}
                    width="24"
                    height="24"
                  />
                </div>
            )
          }
        </div> :
        <TailSpin
          color={loader_color(theme)}
          width="32"
          height="32"
        />
      }
    </div>
  )
}