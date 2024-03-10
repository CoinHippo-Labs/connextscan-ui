import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { XTransferStatus, XTransferErrorStatus } from '@connext/nxtp-utils'
import { Tooltip } from '@material-tailwind/react'
import { constants, utils } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }
import _ from 'lodash'
import moment from 'moment'
import { HiCheckCircle } from 'react-icons/hi'
import { IoWarning } from 'react-icons/io5'
import { BsLightningChargeFill } from 'react-icons/bs'
import { BiInfoCircle } from 'react-icons/bi'
import { AiTwotoneFile } from 'react-icons/ai'
import { MdInfoOutline } from 'react-icons/md'

import ActionRequired from '../action-required'
import Spinner from '../spinner'
import NumberDisplay from '../number'
import Copy from '../copy'
import Image from '../image'
import EnsProfile from '../profile/ens'
import AddMetamask from '../metamask/add-button'
import TimeSpent from '../time/timeSpent'
import { NATIVE_WRAPPABLE_SYMBOLS, PERCENT_ROUTER_FEE, getDistributors } from '../../lib/config'
import { getChainData, getAssetData, getContractData } from '../../lib/object'
import { formatUnits, isNumber } from '../../lib/number'
import { split, toArray, ellipse, equalsIgnoreCase } from '../../lib/utils'

const MAX_RETRY = 10

export default () => {
  const { preferences, chains, assets, dev, latest_bumped_transfers } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, dev: state.dev, latest_bumped_transfers: state.latest_bumped_transfers }), shallowEqual)
  const { page_visible } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { sdk } = { ...dev }
  const { latest_bumped_transfers_data } = { ...latest_bumped_transfers }

  const router = useRouter()
  const { query } = { ...router }
  const { tx } = { ...query }

  const [data, setData] = useState(null)
  const [retry, setRetry] = useState(null)

  useEffect(
    () => {
      const getData = async is_interval => {
        const { xcall_transaction_hash, status } = { ...data }
        const { retryCount, retryTime } = { ...retry }
        if (page_visible && sdk && tx && (data || !retry || (retryCount < MAX_RETRY && moment().diff(moment(retryTime), 'seconds') >= 30)) && (!data || ![XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status) || !equalsIgnoreCase(xcall_transaction_hash, tx))) {
          let response = toArray(await sdk.sdkUtils.getTransfers({ transferId: tx }))
          let _data = _.head(response)
          if (!_data) {
            response = toArray(await sdk.sdkUtils.getTransfers({ transactionHash: tx }))
            _data = _.head(response)
          }

          if (_data) {
            const { transfer_id, origin_domain, origin_transacting_asset, destination_domain, destination_transacting_asset, destination_local_asset, to, xcall_timestamp, execute_transaction_hash, receive_local, status } = { ..._data }
            let { error_status } = { ..._data }
            error_status = !error_status && ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status) && moment().diff(moment(xcall_timestamp * 1000), 'minutes') >= 5 ? XTransferErrorStatus.NoBidsReceived : error_status

            const source_chain_data = getChainData(origin_domain, chains_data)
            const source_asset_data = getAssetData(undefined, assets_data, { chain_id: source_chain_data?.chain_id, contract_address: origin_transacting_asset })
            let source_contract_data = getContractData(source_chain_data?.chain_id, source_asset_data?.contracts)
            // xERC20 asset
            if (source_contract_data?.xERC20 && equalsIgnoreCase(source_contract_data.xERC20, origin_transacting_asset)) {
              source_contract_data = { ...source_contract_data, contract_address: source_contract_data.xERC20 }
              delete source_contract_data.next_asset
            }
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
            // xERC20 asset
            if (destination_contract_data?.xERC20 && equalsIgnoreCase(destination_contract_data.xERC20, destination_transacting_asset)) {
              destination_contract_data = { ...destination_contract_data, contract_address: destination_contract_data.xERC20 }
              delete destination_contract_data.next_asset
            }
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
            setData({
              ..._data,
              source_chain_data,
              destination_chain_data,
              source_asset_data: { ...source_asset_data, ...source_contract_data },
              destination_asset_data: { ...destination_asset_data, ...destination_contract_data },
              source_decimals,
              destination_decimals,
              error_status,
              pending: ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status),
              errored: error_status && !execute_transaction_hash && [XTransferStatus.XCalled, XTransferStatus.Reconciled].includes(status) && !(bumped && error_status === XTransferErrorStatus.ExecutionError),
            })
          }
          else {
            if (!is_interval) {
              setData(false)
            }
            setRetry({ retryCount: (retryCount || 0) + 1, retryTime: moment().valueOf() })
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(true), (!data ? 30 : 15) * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, sdk, tx, retry],
  )

  useEffect(
    () => {
      setRetry(null)
    },
    [tx],
  )

  const {
    transfer_id,
    source_chain_data,
    source_asset_data,
    source_decimals,
    origin_sender,
    origin_transacting_asset,
    origin_transacting_amount,
    destination_chain_data,
    destination_asset_data,
    destination_decimals,
    destination_transacting_amount,
    xcall_caller,
    to,
    xcall_timestamp,
    reconcile_transaction_hash,
    execute_transaction_hash,
    execute_timestamp,
    status,
    error_status,
    routers,
    call_data,
    relayer_fees,
    pending,
    errored,
  } = { ...data }

  const source_symbol = source_asset_data?.symbol
  const source_asset_image = source_asset_data?.image
  const source_gas = source_chain_data?.native_token
  const source_gas_decimals = source_gas?.decimals || 18
  const source_amount = origin_transacting_amount && formatUnits(BigInt(origin_transacting_amount) + BigInt((origin_transacting_amount !== '0' && relayer_fees?.[origin_transacting_asset]) || '0'), source_decimals)

  const destination_symbol = destination_asset_data?.symbol
  const destination_asset_image = destination_asset_data?.image
  const destination_amount = destination_transacting_amount ? formatUnits(destination_transacting_amount, destination_decimals) : source_amount ? source_amount * (1 - PERCENT_ROUTER_FEE / 100) : null

  const id = transfer_id || tx
  const details = _.concat('xcall', routers?.length > 0 ? ['execute', 'reconcile'] : ['reconcile', 'execute']).filter(d => d !== 'reconcile' || reconcile_transaction_hash || execute_transaction_hash)
  const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(error_status) && toArray(latest_bumped_transfers_data).findIndex(d => equalsIgnoreCase(d.transfer_id, transfer_id) && moment().diff(moment(d.updated), 'minutes', true) <= 5) > -1
  const is_from_distributor = getDistributors().findIndex(d => equalsIgnoreCase(d, origin_sender)) > -1
  const sourceAssetComponent = (
    <div className="flex items-center justify-center sm:justify-start xl:justify-center space-x-1 sm:space-x-2">
      {is_from_distributor && (
        <span className="text-lg">
          🎉
        </span>
      )}
      {source_asset_image && (
        <Image
          src={source_asset_image}
          width={24}
          height={24}
          className="rounded-full"
        />
      )}
      {Number(source_amount) >= 0 ?
        <NumberDisplay value={source_amount} className="text-lg font-semibold" /> :
        <Spinner width={32} height={32} />
      }
      {source_asset_data && source_symbol && (
        <span className="text-base font-medium">
          {source_symbol}
        </span>
      )}
    </div>
  )

  return (
    <div className="space-y-4 px-4">
      <div className="flex items-center space-x-2">
        <div className="text-slate-400 dark:text-slate-500 text-sm">
          <span className="xl:hidden">
            {ellipse(id, 16)}
          </span>
          <span className="hidden xl:block">
            {ellipse(id, 24)}
          </span>
        </div>
        <Copy value={id} />
      </div>
      <div className="space-y-6">
        {!data && typeof data === 'boolean' ?
          <>
            <div className="max-w-2xl h-32 sm:h-64 flex items-center mx-auto p-3 sm:p-4">
              <div className="flex flex-col space-y-2">
                <span className="text-xl font-semibold">
                  Transfer not found
                </span>
                <span className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                  If you just submit a new transfer, there will be a delay in displaying your transfer data here.
                </span>
              </div>
            </div>
            <div className="max-w-2xl bg-slate-50 dark:bg-slate-900 rounded flex flex-col space-y-1 mx-auto p-3 sm:p-4">
              <span className="text-slate-600 dark:text-slate-200 text-sm font-light">
                1. Please wait for at least 2 minutes before refreshing this page.
              </span>
              <span className="text-slate-600 dark:text-slate-200 text-sm font-light">
                2. When the network is busy it can take a while for your transaction to propagate through the network and for us to index it.
              </span>
              <span className="text-slate-600 dark:text-slate-200 text-sm font-light">
                {'3. If it still does not show up after at least 5 minutes, double check that you have the correct transaction ID in the URL, and '}
                <a
                  href="https://discord.gg/connext"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="underline text-blue-500 font-medium"
                >
                  reach out to us for support here
                </a>.
              </span>
            </div>
          </> :
          !data ?
            <div className="h-32 flex items-center justify-center">
              <Spinner width={32} height={32} />
            </div> :
            <>
              <div className="max-w-8xl bg-slate-100 dark:bg-slate-900 overflow-x-auto rounded sm:flex sm:items-center sm:justify-between space-y-8 sm:space-y-0 sm:space-x-8 mx-auto py-10 sm:py-8 px-3 sm:px-6">
                <div className="grid grid-cols-1 xl:grid-cols-2 items-center gap-8 sm:gap-4 xl:gap-8">
                  <div className="space-y-2">
                    {source_chain_data ?
                      <div className="flex items-center justify-center sm:justify-start space-x-3">
                        {source_chain_data.image && (
                          <Image
                            src={source_chain_data.image}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        )}
                        <span className="text-lg font-semibold">
                          {source_chain_data.name}
                        </span>
                      </div> :
                      <div className="flex items-center justify-center sm:justify-start">
                        <Spinner width={32} height={32} />
                      </div>
                    }
                    {xcall_caller && (
                      <div className="flex items-center justify-center sm:justify-start space-x-1.5">
                        <a
                          href={source_chain_data?.explorer?.url ? `${source_chain_data.explorer.url}${source_chain_data.explorer.address_path?.replace('{address}', xcall_caller)}` : `/address/${xcall_caller}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <EnsProfile address={xcall_caller} noCopy={true} />
                        </a>
                        <Copy size={20} value={xcall_caller} />
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-center sm:justify-start xl:justify-center space-x-1 sm:space-x-2">
                    {is_from_distributor ?
                      <Tooltip content="NOTE: Connext has added an additional token amount (5bps) to cover fast claiming fees for your airdrop!">
                        {sourceAssetComponent}
                      </Tooltip> :
                      sourceAssetComponent
                    }
                    {source_asset_data && (
                      <AddMetamask
                        chain={source_chain_data?.id}
                        asset={source_asset_data.id}
                        address={source_asset_data.contract_address}
                      />
                    )}
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-1.5">
                  {data ?
                    errored ?
                      <ActionRequired
                        forceDisabled={[XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(error_status) || bumped}
                        initialHidden={[XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(error_status) || bumped}
                        transferData={data}
                        buttonTitle={
                          <Tooltip content={error_status === XTransferErrorStatus.NoBidsReceived || bumped ? 'Transfer processing' : error_status}>
                            <div className={`flex items-start ${error_status === XTransferErrorStatus.NoBidsReceived || bumped ? 'text-blue-500 dark:text-blue-300' : 'text-red-500 dark:text-red-400'} space-x-1`}>
                              {!(error_status === XTransferErrorStatus.NoBidsReceived || bumped) && <IoWarning size={24} />}
                              <div className="flex flex-col">
                                <span className="normal-case text-base font-bold">
                                  {error_status === XTransferErrorStatus.NoBidsReceived || bumped ? 'Transfer processing' : error_status}
                                </span>
                                {!(error_status === XTransferErrorStatus.NoBidsReceived || bumped) && (
                                  <span className="underline text-xs">
                                    Click here to bump
                                  </span>
                                )}
                              </div>
                            </div>
                          </Tooltip>
                        }
                        onTransferBumped={
                          relayerFeeData => {
                            if (data) {
                              setData({ ...data, ...relayerFeeData, error_status: null, pending: true, errored: false })
                            }
                          }
                        }
                        onSlippageUpdated={
                          slippage => {
                            if (data) {
                              setData({ ...data, slippage, error_status: null, pending: true, errored: false })
                            }
                          }
                        }
                      /> :
                      pending ?
                        <div className="flex items-center">
                          <span className="text-blue-500 dark:text-blue-300 text-base font-medium">
                            Processing...
                          </span>
                        </div> :
                        <div className="flex items-center text-green-500 dark:text-green-300 space-x-1">
                          <HiCheckCircle size={24} />
                          <span className="uppercase text-base font-bold">
                            Success
                          </span>
                        </div> :
                    <div className="flex items-center justify-center sm:justify-start">
                      <Spinner width={32} height={32} />
                    </div>
                  }
                  {xcall_timestamp && (errored || pending) && moment().diff(moment(xcall_timestamp * 1000), 'seconds') >= 600 && (
                    <div className="flex flex-col items-center space-y-1">
                      <span>{`Estimated Time: < `}{destination_chain_data?.id === 'ethereum' ? 12 : 2} Hours</span>
                    </div>
                  )}
                  <TimeSpent
                    fromTime={xcall_timestamp}
                    toTime={execute_timestamp}
                    title="Time spent"
                    className={`${errored ? error_status === XTransferErrorStatus.NoBidsReceived ? 'text-slate-600 dark:text-slate-200' : 'text-red-500 dark:text-red-400' : pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-500 dark:text-yellow-400'} font-semibold`}
                  />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 items-center gap-8 sm:gap-4 xl:gap-8">
                  <div className="order-1 sm:order-2 xl:order-1 flex flex-col sm:items-end">
                    <div className="flex items-center justify-center sm:justify-end xl:justify-center space-x-1 sm:space-x-2">
                      <div className="flex items-center justify-center sm:justify-end xl:justify-center space-x-1 sm:space-x-2">
                        {destination_asset_image && (
                          <Image
                            src={destination_asset_image}
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        {Number(destination_amount) >= 0 ?
                          <NumberDisplay value={destination_amount} className="text-lg font-semibold" /> :
                          <Spinner width={32} height={32} />
                        }
                        {destination_asset_data && destination_symbol && (
                          <span className="text-base font-medium">
                            {destination_symbol}
                          </span>
                        )}
                      </div>
                      {destination_asset_data && (
                        <AddMetamask
                          chain={destination_chain_data?.id}
                          asset={destination_asset_data.id}
                          address={destination_asset_data.contract_address}
                        />
                      )}
                    </div>
                  </div>
                  <div className="order-2 sm:order-1 xl:order-2 space-y-2">
                    {destination_chain_data ?
                      <div className="flex items-center justify-center sm:justify-end space-x-3">
                        {destination_chain_data?.image && (
                          <Image
                            src={destination_chain_data.image}
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        )}
                        <span className="text-lg font-semibold">
                          {destination_chain_data.name}
                        </span>
                      </div> :
                      <div className="flex items-center justify-center sm:justify-end">
                        <Spinner width={32} height={32} />
                      </div>
                    }
                    {to && (
                      <div className="flex items-center justify-center sm:justify-end space-x-1.5">
                        <a
                          href={destination_chain_data?.explorer?.url ? `${destination_chain_data.explorer.url}${destination_chain_data.explorer.address_path?.replace('{address}', to)}` : `/address/${to}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <EnsProfile address={to} noCopy={true} />
                        </a>
                        <Copy size={20} value={to} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {details.filter(d => d !== 'reconcile' || data[`${d}_transaction_hash`]).map((d, i) => (
                  <div key={i} className={`form bg-slate-100 dark:bg-slate-900 ${d === 'reconcile' ? 'bg-opacity-75 dark:bg-opacity-75' : ''} rounded space-y-5 py-10 sm:py-8 px-4 sm:px-6`}>
                    <div className="flex items-center justify-between">
                      <Tooltip content={d === 'xcall' ? 'assets sent by user on origin chain' : d === 'execute' ? 'assets delivered to user on destination chain' : d === 'reconcile' ? 'assets minted to router' : null}>
                        <div className={`${d === 'reconcile' ? 'bg-slate-200 dark:bg-slate-800 text-black dark:text-white' : 'bg-blue-400 dark:bg-blue-600 text-white'} rounded capitalize text-xl font-medium py-1 px-3`}>
                          {d === 'xcall' ? 'send' : d === 'execute' ? 'receive' : d}
                        </div>
                      </Tooltip>
                      <div className="flex items-center space-x-4">
                        {d === 'xcall' && (
                          <>
                            {call_data && call_data !== '0x' && <AiTwotoneFile size={24} className="text-yellow-500 dark:text-yellow-400" />}
                            {call_data === '0x' && (routers?.length > 0 || !(execute_transaction_hash || errored)) && (
                              <Tooltip content={routers?.length > 0 ? 'Boosted by routers' : 'Pending router boost'}>
                                <div className="flex items-center">
                                  <BsLightningChargeFill size={24} className={routers?.length > 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-blue-300 dark:text-blue-200'} />
                                  <BiInfoCircle size={14} className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0" />
                                </div>
                              </Tooltip>
                            )}
                          </>
                        )}
                        {data[`${d}_transaction_hash`] ?
                          <HiCheckCircle size={32} className="bg-slate-100 dark:bg-slate-200 rounded-full text-green-500 dark:text-green-400" /> :
                          errored ?
                            d === 'execute' ?
                              null && <ActionRequired
                                forceDisabled={[XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(error_status) || bumped}
                                transferData={data}
                                buttonTitle={
                                  <Tooltip content={error_status === XTransferErrorStatus.NoBidsReceived ? 'The transaction will complete within 180 minutes.' : bumped ? 'Processing' : error_status}>
                                    <div>
                                      {bumped ?
                                        <Spinner width={32} height={32} /> :
                                        error_status === XTransferErrorStatus.NoBidsReceived ?
                                          <MdInfoOutline size={24} className="text-slate-400 dark:text-slate-500" /> :
                                          <IoWarning size={32} className="text-red-600 dark:text-red-500" />
                                      }
                                    </div>
                                  </Tooltip>
                                }
                                onTransferBumped={
                                  relayerFeeData => {
                                    if (data) {
                                      setData({ ...data, ...relayerFeeData, error_status: null, pending: true, errored: false })
                                    }
                                  }
                                }
                                onSlippageUpdated={
                                  slippage => {
                                    if (data) {
                                      setData({ ...data, slippage, error_status: null, pending: true, errored: false })
                                    }
                                  }
                                }
                              /> :
                              null :
                            <Spinner width={32} height={32} />
                        }
                      </div>
                    </div>
                    {(data[`${d}_transaction_hash`] || data[`${d}_simulation_from`]) && (
                      toArray(
                        _.concat(
                          [
                            'transaction_hash',
                            'block_number',
                            'timestamp',
                            d === 'reconcile' ? 'message_status' : undefined,
                            'caller',
                            d === 'xcall' ? 'to' : undefined,
                            d === 'xcall' ? 'recovery' : d === 'execute' ? 'origin_sender' : undefined,
                            d === 'xcall' ? 'relayer_fee' : undefined,
                            'gas_price',
                            'gas_limit',
                            d === 'xcall' && call_data && call_data !== '0x' ? 'call_data' : undefined,
                          ],
                          d === 'execute' ? ['simulation_from', 'simulation_to', 'simulation_network', 'simulation_input'] : undefined,
                        )
                      )
                      .map(((f, j) => (
                        <div key={j} className="space-y-1">
                          <div className="form-label capitalize text-slate-400 dark:text-slate-500 text-base">
                            {split(f, 'normal', '_').join(' ')}
                          </div>
                          <div className="form-element">
                            {[undefined, null].includes(data[['message_status', 'to', 'recovery', 'relayer_fee', 'call_data'].includes(f) ? f === 'relayer_fee' && Object.keys({ ...data[`${f}s`] }).length > 0 ? `${f}s` : f : `${d}_${f}`]) ?
                              <span className="text-slate-400 dark:text-slate-200">
                                -
                              </span> :
                              toArray(data[['message_status', 'to', 'recovery', 'relayer_fee', 'call_data'].includes(f) ? f === 'relayer_fee' && Object.keys({ ...data[`${f}s`] }).length > 0 ? `${f}s` : f : `${d}_${f}`]).map((v, k) => {
                                const { native_token, explorer } = { ...(d === 'xcall' ? source_chain_data : destination_chain_data) }
                                const { symbol, decimals } = { ...native_token }
                                const { url, block_path, transaction_path, address_path } = { ...explorer }

                                let _v
                                let component
                                switch (f) {
                                  case 'transaction_hash':
                                    _v = <span>{ellipse(v, 14)}</span>
                                    component = (
                                      <div className="flex items-center space-x-2">
                                        {url ?
                                          <a
                                            href={`${url}${transaction_path?.replace('{tx}', v)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 dark:text-blue-500"
                                          >
                                            {_v}
                                          </a> :
                                          _v
                                        }
                                        <Copy size={20} value={v} />
                                      </div>
                                    )
                                    break
                                  case 'block_number':
                                    _v = <NumberDisplay value={v} className="text-base font-medium" />
                                    component = url ?
                                      <a
                                        href={`${url}${block_path?.replace('{block}', v)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-400 dark:text-blue-500"
                                      >
                                        {_v}
                                      </a> :
                                      _v
                                    break
                                  case 'timestamp':
                                    component = moment(v * 1000).format('MMM D, YYYY H:mm:ss A')
                                    break
                                  case 'caller':
                                  case 'origin_sender':
                                  case 'recovery':
                                  case 'simulation_to':
                                    _v = <EnsProfile address={v} noCopy={true} />
                                    component = v ?
                                      <div className="flex items-center space-x-2">
                                        {url ?
                                          <a
                                            href={`${url}${address_path?.replace('{address}', v)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 dark:text-blue-500"
                                          >
                                            {_v}
                                          </a> :
                                          _v
                                        }
                                        <Copy size={20} value={v} />
                                      </div> :
                                      <span>-</span>
                                    break
                                  case 'to':
                                    _v = <EnsProfile address={v} noCopy={true} />
                                    component = v ?
                                      <div className="flex items-center space-x-2">
                                        {destination_chain_data?.explorer?.url ?
                                          <a
                                            href={`${destination_chain_data.explorer.url}${destination_chain_data.explorer.address_path?.replace('{address}', v)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 dark:text-blue-500"
                                          >
                                            {_v}
                                          </a> :
                                          _v
                                        }
                                        <Copy size={20} value={v} />
                                      </div> :
                                      <span>-</span>
                                    break
                                  case 'simulation_from':
                                    _v = <EnsProfile address={v} noCopy={true} />
                                    component = v ?
                                      <div className="flex items-center space-x-2">
                                        {source_chain_data?.explorer?.url ?
                                          <a
                                            href={`${source_chain_data.explorer.url}${source_chain_data.explorer.address_path?.replace('{address}', v)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-400 dark:text-blue-500"
                                          >
                                            {_v}
                                          </a> :
                                          _v
                                        }
                                        <Copy size={20} value={v} />
                                      </div> :
                                      <span>-</span>
                                    break
                                  case 'relayer_fee':
                                    if (Object.keys({ ...data[`${f}s`] }).length > 0) {
                                      component = (
                                        <div className="flex flex-col space-y-2">
                                          {Object.entries(data[`${f}s`]).map(([k, v]) => {
                                            return (
                                              <span key={k} className="whitespace-nowrap text-slate-600 dark:text-slate-200 font-semibold space-x-1.5">
                                                <NumberDisplay value={formatUnits(v || '0', k === ZeroAddress ? source_gas_decimals : source_decimals)} className="text-sm" />
                                                <span>{k === ZeroAddress ? source_gas?.symbol : source_symbol}</span>
                                              </span>
                                            )
                                          })}
                                        </div>
                                      )
                                    }
                                    else {
                                      _v = formatUnits(v || '0', decimals),
                                      component = (
                                        <div className="flex items-center space-x-1">
                                          <NumberDisplay value={Number(_v) > 0 ? _v : 0} className="text-base" />
                                          <span>{symbol}</span>
                                        </div>
                                      )
                                    }
                                    break
                                  case 'gas_price':
                                    component = (
                                      <div className="flex items-center space-x-1">
                                        <span>{utils.formatUnits(v, 'gwei')}</span>
                                        <span>Gwei</span>
                                      </div>
                                    )
                                    break
                                  case 'call_data':
                                  case 'simulation_input':
                                    component = v ?
                                      <div className="flex items-start space-x-1">
                                        <div className="bg-slate-50 dark:bg-slate-800 rounded break-all p-2">
                                          {ellipse(v, 53)}
                                        </div>
                                        <div className="mt-2.5">
                                          <Copy size={20} value={v} />
                                        </div>
                                      </div> :
                                      <span>-</span>
                                    break
                                  case 'simulation_network':
                                    component = v
                                    break
                                  default:
                                    component = isNumber(v) ? <NumberDisplay value={v} className="text-base" /> : v
                                    break
                                }

                                return (
                                  <div key={k} className="text-base font-medium">
                                    {component}
                                  </div>
                                )
                              })
                            }
                          </div>
                        </div>
                      )))
                    )}
                  </div>
                ))}
              </div>
            </>
        }
      </div>
    </div>
  )
}