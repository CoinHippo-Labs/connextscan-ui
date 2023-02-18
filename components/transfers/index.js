import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { constants, utils } from 'ethers'
import { XTransferStatus, XTransferErrorStatus } from '@connext/nxtp-utils'
import { TailSpin } from 'react-loader-spinner'
import { Tooltip } from '@material-tailwind/react'
import { HiCheckCircle } from 'react-icons/hi'
import { IoWarning } from 'react-icons/io5'
import { BsLightningChargeFill } from 'react-icons/bs'
import { BiInfoCircle } from 'react-icons/bi'
import { AiTwotoneFile } from 'react-icons/ai'

import ActionRequired from '../action-required'
import AddToken from '../add-token'
import Copy from '../copy'
import Datatable from '../datatable'
import DecimalsFormat from '../decimals-format'
import EnsProfile from '../ens-profile'
import Image from '../image'
import SelectChain from '../select-options/chain'
import SelectAsset from '../select-options/asset'
import SelectStatus from '../select-options/status'
import TimeSpent from '../time-spent'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { toArray, ellipse, equalsIgnoreCase, loaderColor } from '../../lib/utils'

const ROUTER_FEE_PERCENT = Number(process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT)
const LIMIT = 100

export default () => {
  const {
    preferences,
    chains,
    assets,
    dev,
  } = useSelector(
    state => (
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
  const [offset, setOffset] = useState(0)
  const [noMore, setNoMore] = useState(false)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [fromChainSelect, setFromChainSelect] = useState('')
  const [toChainSelect, setToChainSelect] = useState('')
  const [assetSelect, setAssetSelect] = useState('')
  const [statusSelect, setStatusSelect] = useState('')

  useEffect(
    () => {
      if (fromChainSelect && fromChainSelect === toChainSelect) {
        setToChainSelect('')
      }
    },
    [fromChainSelect],
  )

  useEffect(
    () => {
      if (toChainSelect && toChainSelect === fromChainSelect) {
        setFromChainSelect('')
      }
    },
    [toChainSelect],
  )

  useEffect(
    () => {
      const triggering = is_interval => {
        if (sdk) {
          setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
        }
      }

      triggering()

      const interval =
        setInterval(
          () => triggering(true),
          0.25 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [sdk, pathname, address, statusSelect],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (sdk) {
          setFetching(true)

          if (!fetchTrigger) {
            setData(null)
            setOffset(0)
            setNoMore(false)
          }

          let response

          const status = statusSelect && !XTransferErrorStatus[statusSelect] ? statusSelect : undefined
          const errorStatus = statusSelect && XTransferErrorStatus[statusSelect] ? statusSelect : undefined
          const _data = toArray(!fetchTrigger ? [] : data)
          const limit = LIMIT
          const offset = fetchTrigger ? _data.length : 0

          switch (pathname) {
            case '/address/[address]':
              try {
                if (address) {
                  response = toArray(await sdk.sdkUtils.getTransfers({ xcallCaller: address, status, errorStatus, range: { limit, offset } }))

                  if (response.length < 1) {
                    response = toArray(await sdk.sdkUtils.getTransfers({ userAddress: address, status, errorStatus, range: { limit, offset } }))
                  }
                }
              } catch (error) {}
              break
            case '/router/[address]':
              try {
                if (address) {
                  response = toArray(await sdk.sdkUtils.getTransfers({ routerAddress: address, status, errorStatus, range: { limit, offset } }))
                }
              } catch (error) {}
              break
            default:
              try {
                response = toArray(await sdk.sdkUtils.getTransfers({ status, errorStatus, range: { limit, offset } }))
              } catch (error) {}
              break
          }

          if (Array.isArray(response)) {
            response =
              _.orderBy(
                _.uniqBy(
                  _.concat(_data, response),
                  'transfer_id',
                ),
                ['xcall_timestamp'],
                ['desc'],
              )

            response =
              response
                .map(t => {
                  const {
                    origin_domain,
                    origin_transacting_asset,
                    destination_domain,
                    destination_transacting_asset,
                    destination_local_asset,
                    execute_transaction_hash,
                    receive_local,
                    status,
                    error_status,
                  } = { ...t }

                  const source_chain_data = getChain(origin_domain, chains_data)
                  const source_asset_data = getAsset(null, assets_data, source_chain_data?.chain_id, origin_transacting_asset)

                  let source_contract_data = getContract(source_chain_data?.chain_id, source_asset_data?.contracts)
                  // next asset
                  if (source_contract_data?.next_asset && equalsIgnoreCase(source_contract_data.next_asset.contract_address, origin_transacting_asset)) {
                    source_contract_data = {
                      ...source_contract_data,
                      ...source_contract_data.next_asset,
                    }

                    delete source_contract_data.next_asset
                  }
                  // native asset
                  if (!source_contract_data && equalsIgnoreCase(constants.AddressZero, origin_transacting_asset)) {
                    const {
                      nativeCurrency,
                    } = { ..._.head(source_chain_data?.provider_params) }

                    const {
                      symbol,
                    } = { ...nativeCurrency }

                    const _source_asset_data = getAsset(symbol, assets_data)

                    source_contract_data = {
                      ...getContract(source_chain_data?.chain_id, _source_asset_data?.contracts),
                      ...nativeCurrency,
                      contract_address: origin_transacting_asset,
                    }
                  }

                  const source_decimals = source_contract_data?.decimals || 18

                  const destination_chain_data = getChain(destination_domain, chains_data)
                  const _asset_data = getAsset(source_asset_data?.id, assets_data, destination_chain_data?.chain_id)
                  const _contract_data = getContract(destination_chain_data?.chain_id, _asset_data?.contracts)
                  const destination_asset_data = getAsset(null, assets_data, destination_chain_data?.chain_id, [destination_transacting_asset, _asset_data ? receive_local ? _contract_data?.next_asset?.contract_address : _contract_data?.contract_address : destination_local_asset])

                  let destination_contract_data = getContract(destination_chain_data?.chain_id, destination_asset_data?.contracts)
                  // next asset
                  if (destination_contract_data?.next_asset && (equalsIgnoreCase(destination_contract_data.next_asset.contract_address, destination_transacting_asset) || receive_local)) {
                    destination_contract_data = {
                      ...destination_contract_data,
                      ...destination_contract_data.next_asset,
                    }

                    delete destination_contract_data.next_asset
                  }
                  // native asset
                  if (!destination_contract_data && equalsIgnoreCase(constants.AddressZero, destination_transacting_asset)) {
                    const {
                      nativeCurrency,
                    } = { ..._.head(destination_chain_data?.provider_params) }

                    const {
                      symbol,
                    } = { ...nativeCurrency }

                    const _destination_asset_data = getAsset(symbol, assets_data)

                    destination_contract_data = {
                      ...getContract(destination_chain_data?.chain_id, _destination_asset_data?.contracts),
                      ...nativeCurrency,
                      contract_address: destination_transacting_asset,
                    }
                  }

                  const destination_decimals = destination_contract_data?.decimals || 18

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
                    source_decimals,
                    destination_decimals,
                    pending: ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status),
                    errored: error_status && !execute_transaction_hash && ![XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status),
                  }
                })
                .map(t => {
                  const {
                    source_asset_data,
                    destination_asset_data,
                    origin_transacting_amount,
                    destination_transacting_amount,
                    source_decimals,
                    destination_decimals,
                  } = { ...t }

                  const source_amount =
                    origin_transacting_amount &&
                    Number(
                      utils.formatUnits(
                        BigInt(origin_transacting_amount).toString(),
                        source_decimals,
                      )
                    )

                  const destination_amount =
                    destination_transacting_amount ?
                      Number(
                        utils.formatUnits(
                          BigInt(destination_transacting_amount).toString(),
                          destination_decimals,
                        )
                      ) :
                      source_amount * (1 - ROUTER_FEE_PERCENT / 100)

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
            setNoMore(response.length <= _data.length)
          }
          else if (!fetchTrigger) {
            setData([])
            setNoMore(false)
          }

          setFetching(false)
        }
      }

      getData()
    },
    [fetchTrigger],
  )

  const source_chain_data = getChain(fromChainSelect, chains_data)
  const destination_chain_data = getChain(toChainSelect, chains_data)
  const asset_data = getAsset(assetSelect, assets_data)

  const data_filtered =
    toArray(data)
      .filter(t =>
        (!source_chain_data || source_chain_data?.id === t?.source_chain_data?.id) &&
        (!destination_chain_data || destination_chain_data?.id === t?.destination_chain_data?.id) &&
        (!asset_data || [t?.source_asset_data?.id, t?.destination_asset_data?.id].includes(asset_data.id))
      )

  return (
    <div className="space-y-2 mb-6">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="uppercase tracking-wider text-sm font-semibold">
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
              chain={[fromChainSelect, toChainSelect]}
            />
            <SelectStatus
              value={statusSelect}
              onSelect={s => setStatusSelect(s)}
            />
          </div>
        </div>
      </div>
      {data ?
        <div className={`grid space-y-2 gap-${data_filtered.length <= 10 ? 4 : 2}`}>
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
                    <div className="font-semibold mt-0.5">
                      {(props.flatRows?.indexOf(props.row) > -1 ? props.flatRows.indexOf(props.row) : props.value) + 1}
                    </div>
                  ),
                },
                {
                  Header: 'Transfer ID',
                  accessor: 'transfer_id',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      row,
                      value,
                    } = { ...props }

                    const {
                      pending,
                      errored,
                      xcall_timestamp,
                      execute_timestamp,
                      status,
                      error_status,
                      routers,
                      call_data,
                    } = { ...row.original }

                    return (
                      value &&
                      (
                        <div className="flex flex-col items-start space-y-2 mt-0.5">
                          <div className="flex items-center space-x-1">
                            <Link href={`/tx/${value}`}>
                              <div className="text-blue-500 dark:text-white font-semibold">
                                <span className="sm:hidden">
                                  {ellipse(
                                    value,
                                    address ? 6 : 8,
                                  )}
                                </span>
                                <span className="hidden sm:block">
                                  {ellipse(
                                    value,
                                    address ? 8 : 12,
                                  )}
                                </span>
                              </div>
                            </Link>
                            <Copy
                              size={20}
                              value={value}
                            />
                          </div>
                          {
                            call_data && call_data !== '0x' &&
                            (
                              <Tooltip
                                placement="top"
                                content={call_data !== '0x' ? 'Has calldata' : 'No calldata'}
                                className="z-50 bg-dark text-white text-xs"
                              >
                                <div className="flex items-center">
                                  <AiTwotoneFile
                                    size={16}
                                    className={call_data !== '0x' ? 'text-yellow-500 dark:text-yellow-400' : 'text-slate-400 dark:text-slate-500'}
                                  />
                                  <BiInfoCircle
                                    size={14}
                                    className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                  />
                                </div>
                              </Tooltip>
                            )
                          }
                          {
                            address && !['/address/[address]'].includes(pathname) &&
                            (
                              <div className="flex-col items-start space-y-1">
                                {errored ?
                                  <ActionRequired
                                    transferData={row.original}
                                    buttonTitle={
                                      <div className="flex items-center text-red-600 dark:text-red-500 space-x-1">
                                        <IoWarning
                                          size={20}
                                        />
                                        <span className="normal-case font-bold">
                                          {error_status}
                                        </span>
                                      </div>
                                    }
                                    onTransferBumped={relayer_fee => setFetchTrigger(moment().valueOf())}
                                    onSlippageUpdated={slippage => setFetchTrigger(moment().valueOf())}
                                  /> :
                                  <Link href={`/tx/${value}`}>
                                    {pending ?
                                      <div className="flex items-center text-blue-500 dark:text-blue-300 space-x-1.5">
                                        <TailSpin
                                          width="16"
                                          height="16"
                                          color={loaderColor(theme)}
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
                                  </Link>
                                }
                                <div className="flex items-center space-x-2">
                                  {
                                    call_data === '0x' &&
                                    (
                                      <Tooltip
                                        placement="bottom"
                                        content={routers?.length > 0 ? 'Boosted by routers.' : 'Pending router boost.'}
                                        className="z-50 bg-dark text-white text-xs"
                                      >
                                        <div className="flex items-center">
                                          <BsLightningChargeFill
                                            size={16}
                                            className={routers?.length > 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-blue-300 dark:text-blue-200'}
                                          />
                                          <BiInfoCircle
                                            size={14}
                                            className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                          />
                                        </div>
                                      </Tooltip>
                                    )
                                  }
                                  <TimeSpent
                                    title="Time spent"
                                    fromTime={xcall_timestamp}
                                    toTime={execute_timestamp}
                                    className={`${errored ? 'text-red-600 dark:text-red-500' : pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'} font-semibold`}
                                  />
                                </div>
                                <div className="normal-case font-bold">
                                  {status}
                                </div>
                              </div>
                            )
                          }
                        </div>
                      )
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Timestamp',
                  accessor: 'xcall_timestamp',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      value,
                    } = { ...props }

                    return (
                      value &&
                      (
                        <div className="flex flex-col space-y-1 mt-0.5">
                          <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                            {moment(value * 1000).format('MMM D, YYYY')}
                          </span>
                          <span className="text-slate-700 dark:text-slate-200 text-sm font-medium">
                            {moment(value * 1000).format('HH:mm:ss A')}
                          </span>
                        </div>
                      )
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
                      row,
                      value,
                    } = { ...props }

                    const {
                      transfer_id,
                      pending,
                      errored,
                      xcall_timestamp,
                      execute_timestamp,
                      error_status,
                      routers,
                      call_data,
                    } = { ...row.original }

                    return (
                      <div className="flex flex-col items-start space-y-1 mt-0.5">
                        {errored ?
                          <ActionRequired
                            transferData={row.original}
                            buttonTitle={
                              <div className="flex items-center text-red-600 dark:text-red-500 space-x-1">
                                <IoWarning
                                  size={20}
                                />
                                <span className="normal-case font-bold">
                                  {error_status}
                                </span>
                              </div>
                            }
                            onTransferBumped={relayer_fee => setFetchTrigger(moment().valueOf())}
                            onSlippageUpdated={slippage => setFetchTrigger(moment().valueOf())}
                          /> :
                          <Link href={`/tx/${transfer_id}`}>
                            {pending ?
                              <div className="flex items-center text-blue-500 dark:text-blue-300 space-x-1.5">
                                <TailSpin
                                  color={loaderColor(theme)}
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
                          </Link>
                        }
                        <div className="flex items-center space-x-2">
                          {
                            call_data === '0x' &&
                            (
                              <Tooltip
                                placement="bottom"
                                content={routers?.length > 0 ? 'Boosted by routers.' : 'Pending router boost.'}
                                className="z-50 bg-dark text-white text-xs"
                              >
                                <div className="flex items-center">
                                  <BsLightningChargeFill
                                    size={16}
                                    className={routers?.length > 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-blue-300 dark:text-blue-200'}
                                  />
                                  <BiInfoCircle
                                    size={14}
                                    className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                  />
                                </div>
                              </Tooltip>
                            )
                          }
                          <TimeSpent
                            title="Time spent"
                            fromTime={xcall_timestamp}
                            toTime={execute_timestamp}
                            className={`${errored ? 'text-red-600 dark:text-red-500' : pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'} font-semibold`}
                          />
                        </div>
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
                      row,
                      value,
                    } = { ...props }

                    const {
                      source_asset_data,
                      xcall_caller,
                    } = { ...row.original }

                    const {
                      name,
                      image,
                      explorer,
                    } = { ...value }

                    const {
                      url,
                      address_path,
                    } = { ...explorer }

                    const {
                      symbol,
                      amount,
                    } = { ...source_asset_data }

                    return (
                      <div className="space-y-1.5 mb-3">
                        {value ?
                          <div className="h-7 flex items-center justify-start space-x-2">
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
                            <span className="text-sm font-semibold">
                              {name}
                            </span>
                          </div> :
                          <div className="h-7 flex items-center justify-start">
                            <TailSpin
                              width="24"
                              height="24"
                              color={loaderColor(theme)}
                            />
                          </div>
                        }
                        <div className="h-7 flex items-center space-x-2">
                          {
                            source_asset_data?.image &&
                            (
                              <Image
                                src={source_asset_data.image}
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                            )
                          }
                          {
                            amount >= 0 &&
                            (
                              <DecimalsFormat
                                value={amount}
                                className="text-xs font-semibold"
                              />
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
                                      token_data={
                                        {
                                          ...source_asset_data,
                                        }
                                      }
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
                            <div className="flex items-center justify-start space-x-1">
                              <a
                                href={url ? `${url}${address_path?.replace('{address}', xcall_caller)}` : `/address/${xcall_caller}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <EnsProfile
                                  address={xcall_caller}
                                  noCopy={true}
                                  noImage={true}
                                  fallback={
                                    <span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
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
                                    </span>
                                  }
                                />
                              </a>
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
                      row,
                      value,
                    } = { ...props }

                    const {
                      destination_asset_data,
                      to,
                    } = { ...row.original }

                    const {
                      name,
                      image,
                      explorer,
                    } = { ...value }

                    const {
                      url,
                      address_path,
                    } = { ...explorer }

                    const {
                      symbol,
                      amount,
                    } = { ...destination_asset_data }

                    return (
                      <div className="space-y-1.5 mb-3">
                        {value ?
                          <div className="h-7 flex items-center justify-start space-x-2">
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
                            <span className="text-sm font-semibold">
                              {name}
                            </span>
                          </div> :
                          <div className="h-7 flex items-center justify-start">
                            <TailSpin
                              width="24"
                              height="24"
                              color={loaderColor(theme)}
                            />
                          </div>
                        }
                        <div className="h-7 flex items-center space-x-2">
                          {
                            destination_asset_data?.image &&
                            (
                              <Image
                                src={destination_asset_data.image}
                                width={20}
                                height={20}
                                className="rounded-full"
                              />
                            )
                          }
                          {
                            amount >= 0 &&
                            (
                              <DecimalsFormat
                                value={amount}
                                className="text-xs font-semibold"
                              />
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
                                      token_data={
                                        {
                                          ...destination_asset_data,
                                        }
                                      }
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
                            <div className="flex items-center justify-start space-x-1">
                              <a
                                href={url ? `${url}${address_path?.replace('{address}', to)}` : `/address/${to}`}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                <EnsProfile
                                  address={to}
                                  noCopy={true}
                                  noImage={true}
                                  fallback={
                                    <span className="text-slate-400 dark:text-slate-600 text-xs font-semibold">
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
                                    </span>
                                  }
                                />
                              </a>
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
                {
                  Header: 'Xcall Status',
                  accessor: 'xcall_status',
                  disableSortBy: true,
                  Cell: props => {
                    const {
                      row,
                    } = { ...props }

                    const {
                      transfer_id,
                      status,
                    } = { ...row.original }

                    return (
                      <div className="flex flex-col items-start space-y-1 mt-0.5">
                        <Link href={`/tx/${transfer_id}`}>
                          <div className="normal-case font-bold">
                            {status}
                          </div>
                        </Link>
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
              ]
              .filter(c =>
                !address || ['/address/[address]'].includes(pathname) ||
                !['xcall_timestamp','status', 'xcall_status'].includes(c.accessor)
              )
            }
            size="small"
            data={data_filtered}
            noPagination={data_filtered.length <= 10}
            defaultPageSize={address ? 10 : 25}
            className="no-border"
          />
          {
            data.length > 0 &&
            (
              !fetching ?
                data.length >= LIMIT && !noMore &&
                (
                  <button
                    onClick={
                      () => {
                        setOffset(data.length)
                        setFetchTrigger(typeof fetchTrigger === 'number' ? true : 1)
                      }
                    }
                    className="max-w-min whitespace-nowrap text-slate-400 hover:text-blue-500 dark:text-slate-200 dark:hover:text-blue-400 font-normal hover:font-medium mx-auto"
                  >
                    Load more
                  </button>
                ) :
                <div className="flex justify-center">
                  <TailSpin
                    width="24"
                    height="24"
                    color={loaderColor(theme)}
                  />
                </div>
            )
          }
        </div> :
        <TailSpin
          width="32"
          height="32"
          color={loaderColor(theme)}
        />
      }
    </div>
  )
}