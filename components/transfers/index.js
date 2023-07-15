import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { XTransferStatus, XTransferErrorStatus } from '@connext/nxtp-utils'
import { Tooltip } from '@material-tailwind/react'
import { constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import _ from 'lodash'
import moment from 'moment'
import { HiCheckCircle } from 'react-icons/hi'
import { IoWarning } from 'react-icons/io5'
import { BsLightningChargeFill } from 'react-icons/bs'
import { BiInfoCircle } from 'react-icons/bi'
import { AiTwotoneFile } from 'react-icons/ai'

import ActionRequired from '../action-required'
import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import Copy from '../copy'
import Image from '../image'
import EnsProfile from '../profile/ens'
import AddMetamask from '../metamask/add-button'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import SelectStatus from '../select/status'
import SelectErrorStatus from '../select/error-status'
import TimeSpent from '../time/timeSpent'
import TimeAgo from '../time/timeAgo'
import { NATIVE_WRAPPABLE_SYMBOLS, PERCENT_ROUTER_FEE } from '../../lib/config'
import { getChainData, getAssetData, getContractData } from '../../lib/object'
import { formatUnits } from '../../lib/number'
import { toArray, ellipse, equalsIgnoreCase, getQueryParams } from '../../lib/utils'

const LIMIT = 100

export default () => {
  const { chains, assets, dev, latest_bumped_transfers } = useSelector(state => ({ chains: state.chains, assets: state.assets, dev: state.dev, latest_bumped_transfers: state.latest_bumped_transfers }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { sdk } = { ...dev }
  const { latest_bumped_transfers_data } = { ...latest_bumped_transfers }

  const router = useRouter()
  const { pathname, query, asPath } = { ...router }
  const { address } = { ...query }

  const [data, setData] = useState(null)
  const [noMore, setNoMore] = useState(false)
  const [offset, setOffset] = useState(0)
  const [filters, setFilters] = useState(null)
  const [fetchTrigger, setFetchTrigger] = useState(undefined)
  const [fetching, setFetching] = useState(false)

  useEffect(
    () => {
      if (asPath) {
        setFilters({ ...getQueryParams(asPath) })
      }
    },
    [asPath],
  )

  useEffect(
    () => {
      if (fetchTrigger !== undefined) {
        const qs = new URLSearchParams()
        Object.entries({ ...filters }).filter(([k, v]) => v).forEach(([k, v]) => { qs.append(k, v) })
        const qs_string = qs.toString()
        router.push(`${pathname}${qs_string ? `?${qs_string}` : ''}`)
      }
    },
    [fetchTrigger],
  )

  useEffect(
    () => {
      const trigger = is_interval => {
        if (chains_data && pathname && filters) {
          setFetchTrigger(is_interval ? moment().valueOf() : typeof fetchTrigger === 'number' ? null : 0)
        }
      }

      trigger()
      const interval = setInterval(() => trigger(true), 0.3 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [chains_data, pathname, filters],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (sdk && filters) {
          setFetching(true)

          if (!fetchTrigger) {
            setData(null)
            setNoMore(false)
            setOffset(0)
          }

          const _data = toArray(fetchTrigger && data)
          const limit = LIMIT
          const offset = [true, 1].includes(fetchTrigger) ? _data.length : 0
          const { sourceChain, destinationChain, status, errorStatus } = { ...filters }

          const source_chain_data = getChainData(sourceChain, chains_data)
          const destination_chain_data = getChainData(destinationChain, chains_data)
          const originDomain = source_chain_data?.domain_id
          const destinationDomain = destination_chain_data?.domain_id

          let response
          switch (pathname) {
            case '/address/[address]':
              try {
                if (address) {
                  response = toArray(await sdk.sdkUtils.getTransfers({ xcallCaller: address, originDomain, destinationDomain, status, errorStatus, range: { limit, offset } }))
                  if (response.length < 1) {
                    response = toArray(await sdk.sdkUtils.getTransfers({ userAddress: address, originDomain, destinationDomain, status, errorStatus, range: { limit, offset } }))
                  }
                }
              } catch (error) {}
              break
            case '/router/[address]':
              try {
                if (address) {
                  response = toArray(await sdk.sdkUtils.getTransfers({ routerAddress: address, originDomain, destinationDomain, status, errorStatus, range: { limit, offset } }))
                }
              } catch (error) {}
              break
            default:
              try {
                response = toArray(await sdk.sdkUtils.getTransfers({ originDomain, destinationDomain, status, errorStatus, range: { limit, offset } }))
              } catch (error) {}
              break
          }

          if (response) {
            response = _.orderBy(_.uniqBy(_.concat(_data, response), 'transfer_id'), ['xcall_timestamp'], ['desc'])
            response = response.map(d => {
              const { transfer_id, origin_domain, destination_domain, origin_transacting_asset, destination_transacting_asset, destination_local_asset, to, execute_transaction_hash, xcall_timestamp, receive_local, status } = { ...d }
              let { error_status } = { ...d }
              error_status = !error_status && ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status) && moment().diff(moment(xcall_timestamp * 1000), 'minutes') >= 5 ? XTransferErrorStatus.NoBidsReceived : error_status

              const source_chain_data = getChainData(origin_domain, chains_data)
              const source_asset_data = getAssetData(undefined, assets_data, { chain_id: source_chain_data?.chain_id, contract_address: origin_transacting_asset })
              let source_contract_data = getContractData(source_chain_data?.chain_id, source_asset_data?.contracts)
              // next asset
              if (source_contract_data?.next_asset && equalsIgnoreCase(source_contract_data.next_asset.contract_address, origin_transacting_asset)) {
                source_contract_data = { ...source_contract_data, ...source_contract_data.next_asset }
                delete source_contract_data.next_asset
              }
              // native asset
              if (!source_contract_data && equalsIgnoreCase(ZeroAddress, origin_transacting_asset)) {
                const { chain_id, native_token } = { ...source_chain_data }
                const { symbol } = { ...native_token }
                const { contracts } = { ...getAssetData(symbol, assets_data) }
                source_contract_data = { ...getContractData(chain_id, contracts), ...native_token, contract_address: origin_transacting_asset }
              }
              const source_decimals = source_contract_data?.decimals || 18

              const destination_chain_data = getChainData(destination_domain, chains_data)
              const _asset_data = getAssetData(source_asset_data?.id, assets_data, { chain_id: destination_chain_data?.chain_id })
              const _contract_data = getContractData(destination_chain_data?.chain_id, _asset_data?.contracts)
              const destination_asset_data = getAssetData(undefined, assets_data, { chain_id: destination_chain_data?.chain_id, contract_addresses: [destination_transacting_asset, _asset_data ? (receive_local ? _contract_data?.next_asset : _contract_data)?.contract_address : destination_local_asset] })
              let destination_contract_data = getContractData(destination_chain_data?.chain_id, destination_asset_data?.contracts)
              // next asset
              if (destination_contract_data?.next_asset && (equalsIgnoreCase(destination_contract_data.next_asset.contract_address, destination_transacting_asset) || receive_local)) {
                destination_contract_data = { ...destination_contract_data, ...destination_contract_data.next_asset }
                delete destination_contract_data.next_asset
              }
              // native asset
              const { chain_id, native_token, unwrapper_contract } = { ...destination_chain_data }
              const { symbol } = { ...native_token }
              const _destination_asset_data = getAssetData(NATIVE_WRAPPABLE_SYMBOLS.find(s => symbol?.endsWith(s)) || symbol, assets_data)
              if ((!destination_contract_data && equalsIgnoreCase(ZeroAddress, destination_transacting_asset)) || (destination_asset_data?.id === _destination_asset_data?.id && equalsIgnoreCase(to, unwrapper_contract))) {
                const { contracts } = { ...getAssetData(symbol, assets_data) }
                destination_contract_data = { ...getContractData(chain_id, contracts), ...native_token, contract_address: ZeroAddress }
              }
              const destination_decimals = destination_contract_data?.decimals || 18

              const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(error_status) && toArray(latest_bumped_transfers_data).findIndex(d => equalsIgnoreCase(d.transfer_id, transfer_id) && moment().diff(moment(d.updated), 'minutes', true) <= 5) > -1
              return {
                ...d,
                source_chain_data,
                destination_chain_data,
                source_asset_data: { ...source_asset_data, ...source_contract_data },
                destination_asset_data: { ...destination_asset_data, ...destination_contract_data },
                source_decimals,
                destination_decimals,
                error_status,
                pending: ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status) || [XTransferErrorStatus.NoBidsReceived].includes(error_status),
                errored: error_status && !execute_transaction_hash && [XTransferStatus.XCalled, XTransferStatus.Reconciled].includes(status) && !(bumped && error_status === XTransferErrorStatus.ExecutionError) && error_status !== XTransferErrorStatus.NoBidsReceived,
              }
            })
            .map(d => {
              const { source_asset_data, destination_asset_data, origin_transacting_asset, origin_transacting_amount, destination_transacting_amount, source_decimals, destination_decimals, relayer_fees } = { ...d }
              const source_amount = origin_transacting_amount && formatUnits(BigInt(origin_transacting_amount) + BigInt(relayer_fees?.[origin_transacting_asset] || 0), source_decimals)
              const destination_amount = destination_transacting_amount ? formatUnits(BigInt(destination_transacting_amount), destination_decimals) : source_amount * (1 - PERCENT_ROUTER_FEE / 100)
              return {
                ...d,
                source_asset_data: { ...source_asset_data, amount: source_amount },
                destination_asset_data: { ...destination_asset_data, amount: destination_amount },
              }
            })
            setData(response)
            setNoMore(!offset ? response.length < _data.length : response.length <= _data.length)
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

  const { sourceChain, destinationChain, asset, status, errorStatus } = { ...filters }
  const source_chain_data = getChainData(sourceChain, chains_data)
  const destination_chain_data = getChainData(destinationChain, chains_data)
  const asset_data = getAssetData(asset, assets_data)
  const dataFiltered = toArray(data).filter(d => (!source_chain_data || source_chain_data.id === d.source_chain_data?.id) && (!destination_chain_data || destination_chain_data.id === d.destination_chain_data?.id) && (!asset_data || [d.source_asset_data?.id, d.destination_asset_data?.id].includes(asset_data.id)))

  return (
    <div className="children">
      {data ?
        <div className="space-y-2 sm:space-y-4 mt-4 sm:mt-6 mx-auto">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between space-y-2 sm:space-y-0 space-x-0 sm:space-x-3 px-3">
            <div className="uppercase text-sm font-semibold">
              Transfers
            </div>
            <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 my-4 sm:my-0">
              <div className="flex items-center space-x-2">
                <SelectChain value={sourceChain || ''} onSelect={c => setFilters({ ...filters, sourceChain: c })} />
                <span className="font-semibold">
                  To
                </span>
                <SelectChain value={destinationChain || ''} onSelect={c => setFilters({ ...filters, destinationChain: c })} />
              </div>
              <div className="flex items-center space-x-2">
                <SelectAsset
                  value={asset || ''}
                  onSelect={a => setFilters({ ...filters, asset: a })}
                  chain={sourceChain}
                  destinationChain={destinationChain}
                />
                <SelectStatus value={status || ''} onSelect={s => setFilters({ ...filters, status: s })} />
                <SelectErrorStatus value={errorStatus || ''} onSelect={s => setFilters({ ...filters, errorStatus: s })} />
              </div>
            </div>
          </div>
          <div className="px-3">
            <Datatable
              columns={[
                {
                  Header: '#',
                  accessor: 'i',
                  disableSortBy: true,
                  Cell: props => (
                    <span className="text-black dark:text-white font-medium">
                      {props.flatRows?.indexOf(props.row) + 1}
                    </span>
                  ),
                },
                {
                  Header: 'Transfer ID',
                  accessor: 'transfer_id',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { execute_transaction_hash, xcall_timestamp, execute_timestamp, routers, call_data, status, error_status, pending, errored } = { ...row.original }
                    const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(error_status) && toArray(latest_bumped_transfers_data).findIndex(d => equalsIgnoreCase(d.transfer_id, value) && moment().diff(moment(d.updated), 'minutes', true) <= 5) > -1
                    return value && (
                      <div className="flex flex-col items-start space-y-2 mt-0.5">
                        <div className="flex items-center space-x-1">
                          <Link href={`/tx/${value}`}>
                            <div className="text-blue-500 dark:text-white font-semibold">
                              <span className="sm:hidden">
                                {ellipse(value, address ? 6 : 8)}
                              </span>
                              <span className="hidden sm:block">
                                {ellipse(value, address ? 8 : 12)}
                              </span>
                            </div>
                          </Link>
                          <Copy size={20} value={value} />
                        </div>
                        {call_data && call_data !== '0x' && <AiTwotoneFile size={24} className="text-yellow-500 dark:text-yellow-400" />}
                        {address && !['/address/[address]'].includes(pathname) && (
                          <div className="flex-col items-start space-y-1">
                            {errored ?
                              <Link href={`/tx/${value}`}>
                                <ActionRequired
                                  forceDisabled={true}
                                  transferData={row.original}
                                  buttonTitle={
                                    <Tooltip content={error_status === XTransferErrorStatus.NoBidsReceived ? 'The transfer is not getting boosted by routers (fast path) and will complete in slow path eventually, if no new bids are received till the end.' : bumped ? 'Processing' : error_status}>
                                      <div className="flex items-center text-red-600 dark:text-red-500 space-x-1">
                                        <IoWarning size={20} />
                                        <span className={`normal-case ${bumped ? 'text-blue-500 dark:text-blue-300' : ''} font-bold`}>
                                          {bumped ? 'Processing' : error_status}
                                        </span>
                                      </div>
                                    </Tooltip>
                                  }
                                  onTransferBumped={relayerFeeData => setFetchTrigger(moment().valueOf())}
                                  onSlippageUpdated={slippage => setFetchTrigger(moment().valueOf())}
                                />
                              </Link> :
                              <Link href={`/tx/${value}`}>
                                {pending ?
                                  <div className="flex items-center space-x-1.5">
                                    <Spinner width={16} height={16} />
                                    <span className="text-blue-500 dark:text-blue-300 font-medium">
                                      Processing...
                                    </span>
                                  </div> :
                                  <div className="flex items-center space-x-1">
                                    <HiCheckCircle size={20} />
                                    <span className="uppercase text-green-500 dark:text-green-400 font-bold">
                                      Success
                                    </span>
                                  </div>
                                }
                              </Link>
                            }
                            <div className="flex items-center space-x-2">
                              {call_data === '0x' && (routers?.length > 0 || !(execute_transaction_hash || errored)) && (
                                <Tooltip placement="bottom" content={routers?.length > 0 ? 'Boosted by routers' : 'Pending router boost'}>
                                  <div className="flex items-center">
                                    <BsLightningChargeFill size={16} className={routers?.length > 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-blue-300 dark:text-blue-200'} />
                                    <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                                  </div>
                                </Tooltip>
                              )}
                              <TimeSpent
                                fromTime={xcall_timestamp}
                                toTime={execute_timestamp}
                                title="Time spent"
                                className={`${errored ? 'text-red-500 dark:text-red-400' : pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-500 dark:text-yellow-400'} font-semibold`}
                              />
                            </div>
                            <div className="normal-case font-bold">
                              {status}
                            </div>
                          </div>
                        )}
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
                {
                  Header: 'Timestamp',
                  accessor: 'xcall_timestamp',
                  disableSortBy: true,
                  Cell: props => {
                    const { value } = { ...props }
                    return value && (
                      <div className="flex items-center mt-0.5">
                        <TimeAgo time={moment(value * 1000).unix()} className="text-slate-400 dark:text-slate-500 text-sm font-medium" />
                      </div>
                    )
                  },
                },
                {
                  Header: 'Status',
                  accessor: 'status',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { transfer_id, execute_transaction_hash, xcall_timestamp, execute_timestamp, routers, call_data, error_status, pending, errored } = { ...row.original }
                    const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(error_status) && toArray(latest_bumped_transfers_data).findIndex(d => equalsIgnoreCase(d.transfer_id, transfer_id) && moment().diff(moment(d.updated), 'minutes', true) <= 5) > -1
                    return (
                      <div className="flex flex-col items-start space-y-1 mt-0.5">
                        {errored ?
                          <Link href={`/tx/${transfer_id}`}>
                            <ActionRequired
                              forceDisabled={true}
                              transferData={row.original}
                              buttonTitle={
                                <Tooltip content={error_status === XTransferErrorStatus.NoBidsReceived ? 'The transfer is not getting boosted by routers (fast path) and will complete in slow path eventually, if no new bids are received till the end.' : bumped ? 'Processing' : error_status}>
                                  <div className="flex items-center text-red-600 dark:text-red-500 space-x-1">
                                    <IoWarning size={20} />
                                    <span className={`normal-case ${bumped ? 'text-blue-500 dark:text-blue-300' : ''} font-bold`}>
                                      {bumped ? 'Processing' : error_status}
                                    </span>
                                  </div>
                                </Tooltip>
                              }
                              onTransferBumped={relayerFeeData => setFetchTrigger(moment().valueOf())}
                              onSlippageUpdated={slippage => setFetchTrigger(moment().valueOf())}
                            />
                          </Link> :
                          <Link href={`/tx/${transfer_id}`}>
                            {pending ?
                              <div className="flex items-center space-x-1.5">
                                <Spinner width={16} height={16} />
                                <span className="text-blue-500 dark:text-blue-300 font-medium">
                                  Processing...
                                </span>
                              </div> :
                              <div className="flex items-center space-x-1">
                                <HiCheckCircle size={20} />
                                <span className="uppercase text-green-500 dark:text-green-400 font-bold">
                                  Success
                                </span>
                              </div>
                            }
                          </Link>
                        }
                        <div className="flex items-center space-x-2">
                          {call_data === '0x' && (routers?.length > 0 || !(execute_transaction_hash || errored)) && (
                            <Tooltip placement="bottom" content={routers?.length > 0 ? 'Boosted by routers' : 'Pending router boost'}>
                              <div className="flex items-center">
                                <BsLightningChargeFill size={16} className={routers?.length > 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-blue-300 dark:text-blue-200'} />
                                <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                              </div>
                            </Tooltip>
                          )}
                          <TimeSpent
                            fromTime={xcall_timestamp}
                            toTime={execute_timestamp}
                            title="Time spent"
                            className={`${errored ? 'text-red-500 dark:text-red-400' : pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-500 dark:text-yellow-400'} font-semibold`}
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
                    const { value, row } = { ...props }
                    const { source_asset_data, xcall_caller } = { ...row.original }
                    const { name, image, explorer } = { ...value }
                    const { url, address_path } = { ...explorer }
                    const { id, contract_address, symbol, amount } = { ...source_asset_data }
                    return (
                      <div className="space-y-1.5 mb-3">
                        {value ?
                          <div className="h-7 flex items-center justify-start space-x-2">
                            {image && (
                              <Image
                                src={image}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            )}
                            <span className="font-semibold">
                              {name}
                            </span>
                          </div> :
                          <div className="h-7 flex items-center justify-start">
                            <Spinner />
                          </div>
                        }
                        <div className="h-7 flex items-center space-x-2">
                          {source_asset_data?.image && (
                            <Image
                              src={source_asset_data.image}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          )}
                          {Number(amount) >= 0 && <NumberDisplay value={amount} className="text-xs font-semibold" />}
                          {source_asset_data && (
                            <>
                              {symbol && (
                                <span className="text-xs font-medium">
                                  {symbol}
                                </span>
                              )}
                              {contract_address && (
                                <AddMetamask
                                  chain={value?.id}
                                  asset={id}
                                  address={contract_address}
                                />
                              )}
                            </>
                          )}
                        </div>
                        {xcall_caller && (
                          <div className="flex items-center justify-start space-x-1">
                            <a
                              href={url ? `${url}${address_path?.replace('{address}', xcall_caller)}` : `/address/${xcall_caller}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile address={xcall_caller} noCopy={true} />
                            </a>
                            <Copy value={xcall_caller} />
                          </div>
                        )}
                      </div>
                    )
                  },
                },
                {
                  Header: 'Destination',
                  accessor: 'destination_chain_data',
                  disableSortBy: true,
                  Cell: props => {
                    const { value, row } = { ...props }
                    const { destination_asset_data, to } = { ...row.original }
                    const { name, image, explorer } = { ...value }
                    const { url, address_path } = { ...explorer }
                    const { id, contract_address, symbol, amount } = { ...destination_asset_data }
                    return (
                      <div className="space-y-1.5 mb-3">
                        {value ?
                          <div className="h-7 flex items-center justify-start space-x-2">
                            {image && (
                              <Image
                                src={image}
                                width={24}
                                height={24}
                                className="rounded-full"
                              />
                            )}
                            <span className="font-semibold">
                              {name}
                            </span>
                          </div> :
                          <div className="h-7 flex items-center justify-start">
                            <Spinner />
                          </div>
                        }
                        <div className="h-7 flex items-center space-x-2">
                          {destination_asset_data?.image && (
                            <Image
                              src={destination_asset_data.image}
                              width={20}
                              height={20}
                              className="rounded-full"
                            />
                          )}
                          {Number(amount) >= 0 && <NumberDisplay value={amount} className="text-xs font-semibold" />}
                          {destination_asset_data && (
                            <>
                              {symbol && (
                                <span className="text-xs font-medium">
                                  {symbol}
                                </span>
                              )}
                              {contract_address && (
                                <AddMetamask
                                  chain={value?.id}
                                  asset={id}
                                  address={contract_address}
                                />
                              )}
                            </>
                          )}
                        </div>
                        {to && (
                          <div className="flex items-center justify-start space-x-1">
                            <a
                              href={url ? `${url}${address_path?.replace('{address}', to)}` : `/address/${to}`}
                              target="_blank"
                              rel="noopener noreferrer"
                            >
                              <EnsProfile address={to} noCopy={true} />
                            </a>
                            <Copy value={to} />
                          </div>
                        )}
                      </div>
                    )
                  },
                },
                {
                  Header: 'Xcall Status',
                  accessor: 'xcall_status',
                  disableSortBy: true,
                  Cell: props => {
                    const { row } = { ...props }
                    const { transfer_id, status } = { ...row.original }
                    return (
                      <div className="mt-0.5">
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
                {
                  Header: 'Error Status',
                  accessor: 'error_status',
                  disableSortBy: true,
                  Cell: props => {
                    const { row } = { ...props }
                    let { value } = { ...props }
                    const { transfer_id, status } = { ...row.original }
                    if (value === XTransferErrorStatus.ExecutionError && status === XTransferStatus.CompletedSlow) {
                      value = 'AuthenticationCheck'
                    }
                    if (value && ![XTransferStatus.XCalled, XTransferStatus.Reconciled].includes(status)) {
                      value = null
                    }
                    const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(value) && toArray(latest_bumped_transfers_data).findIndex(d => equalsIgnoreCase(d.transfer_id, transfer_id) && moment().diff(moment(d.updated), 'minutes', true) <= 5) > -1
                    return (
                      <div className="mt-0.5">
                        <Link href={`/tx/${transfer_id}`}>
                          <div className="normal-case font-bold">
                            {(bumped ? 'Processing' : value) || '-'}
                          </div>
                        </Link>
                      </div>
                    )
                  },
                  headerClassName: 'whitespace-nowrap',
                },
              ].filter(c => !address || ['/address/[address]'].includes(pathname) || !['xcall_timestamp', 'status', 'xcall_status', 'error_status'].includes(c.accessor))}
              size="small"
              data={dataFiltered}
              defaultPageSize={address ? 10 : 25}
              noPagination={dataFiltered.length <= 10}
              extra={
                data.length > 0 && (
                  <div className="flex justify-center">
                    {!fetching ?
                      data.length >= LIMIT && !noMore && (
                        <button
                          onClick={
                            () => {
                              setOffset(data.length)
                              setFetchTrigger(typeof fetchTrigger === 'number' ? true : 1)
                            }
                          }
                          className="flex items-center text-black dark:text-white space-x-0.5"
                        >
                          <span className="font-medium">
                            Load more
                          </span>
                        </button>
                      ) :
                      <Spinner />
                    }
                  </div>
                )
              }
              className="no-border no-shadow"
            />
          </div>
        </div> :
        <Spinner />
      }
    </div>
  )
}