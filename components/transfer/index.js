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
import { MdInfoOutline } from 'react-icons/md'

import ActionRequired from '../action-required'
import AddToken from '../add-token'
import Copy from '../copy'
import DecimalsFormat from '../decimals-format'
import EnsProfile from '../ens-profile'
import Image from '../image'
import TimeSpent from '../time-spent'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { split, toArray, ellipse, equalsIgnoreCase, loaderColor } from '../../lib/utils'

const NATIVE_WRAPPABLE_SYMBOLS = ['ETH', 'MATIC', 'DAI']
const ROUTER_FEE_PERCENT = Number(process.env.NEXT_PUBLIC_ROUTER_FEE_PERCENT)

export default () => {
  const {
    preferences,
    chains,
    assets,
    dev,
    latest_bumped_transfers,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        dev: state.dev,
        latest_bumped_transfers: state.latest_bumped_transfers,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
    page_visible,
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
    latest_bumped_transfers_data,
  } = { ...latest_bumped_transfers }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    tx,
  } = { ...query }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async is_interval => {
        const {
          status,
        } = { ...data }

        if (page_visible && sdk && tx && (!data || ![XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status) || !equalsIgnoreCase(data.xcall_transaction_hash, tx))) {
          let response = toArray(await sdk.sdkUtils.getTransfers({ transferId: tx }))
          let _data = _.head(response)
          if (!_data) {
            response = toArray(await sdk.sdkUtils.getTransfers({ transactionHash: tx }))
            _data = _.head(response)
          }

          if (_data) {
            const {
              origin_domain,
              origin_transacting_asset,
              destination_domain,
              destination_transacting_asset,
              destination_local_asset,
              to,
              xcall_timestamp,
              execute_transaction_hash,
              receive_local,
              status,
            } = { ..._data }
            let {
              error_status,
            } = { ..._data }

            error_status = !error_status && ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status) && moment().diff(moment(xcall_timestamp * 1000), 'minutes') >= 5 ? XTransferErrorStatus.NoBidsReceived : error_status

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
            const {
              nativeCurrency,
            } = { ..._.head(destination_chain_data?.provider_params) }

            const {
              symbol,
            } = { ...nativeCurrency }

            const _destination_asset_data = getAsset(NATIVE_WRAPPABLE_SYMBOLS.find(s => symbol?.endsWith(s)) || symbol, assets_data)
            if ((!destination_contract_data && equalsIgnoreCase(constants.AddressZero, destination_transacting_asset)) || (destination_asset_data?.id === _destination_asset_data?.id && equalsIgnoreCase(to, destination_chain_data?.unwrapper_contract))) {
              destination_contract_data = {
                ...getContract(destination_chain_data?.chain_id, _destination_asset_data?.contracts),
                ...nativeCurrency,
                contract_address: constants.AddressZero,
              }
            }

            const destination_decimals = destination_contract_data?.decimals || 18
            const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(error_status) && toArray(latest_bumped_transfers_data).findIndex(t => equalsIgnoreCase(t.transfer_id, transfer_id) && moment().diff(moment(t.updated), 'minutes', true) <= 5) > -1

            setData(
              {
                ..._data,
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
                error_status,
                pending: ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(status),
                errored: error_status && !execute_transaction_hash && [XTransferStatus.XCalled, XTransferStatus.Reconciled].includes(status) && !(bumped && error_status === XTransferErrorStatus.ExecutionError),
              }
            )
          }
          else if (!is_interval) {
            setData(false)
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(true), 0.25 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, sdk, tx]
  )

  const {
    transfer_id,
    source_chain_data,
    source_asset_data,
    source_decimals,
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
  const source_gas_native_token = _.head(source_chain_data?.provider_params)?.nativeCurrency
  const source_gas_decimals = source_gas_native_token?.decimals || 18

  const destination_symbol = destination_asset_data?.symbol
  const destination_asset_image = destination_asset_data?.image

  const source_amount = origin_transacting_amount && Number(utils.formatUnits((BigInt(origin_transacting_amount) + BigInt(relayer_fees?.[origin_transacting_asset] || 0)).toString(), source_decimals))
  const destination_amount = destination_transacting_amount ? Number(utils.formatUnits(BigInt(destination_transacting_amount).toString(), destination_decimals)) : source_amount * (1 - ROUTER_FEE_PERCENT / 100)

  const details = _.concat('xcall', routers?.length > 0 ? ['execute', 'reconcile'] : ['reconcile', 'execute']).filter(s => s !== 'reconcile' || reconcile_transaction_hash || execute_transaction_hash)
  const id = transfer_id || tx
  const bumped = [XTransferErrorStatus.LowRelayerFee, XTransferErrorStatus.ExecutionError].includes(error_status) && toArray(latest_bumped_transfers_data).findIndex(t => equalsIgnoreCase(t.transfer_id, transfer_id) && moment().diff(moment(t.updated), 'minutes', true) <= 5) > -1

  return (
    <div className="space-y-4 -mt-1 mb-6">
      <div className="flex items-center text-sm space-x-2">
        <div className="text-slate-400 dark:text-slate-600">
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
          <div className="h-32 flex items-center justify-center tracking-widest text-xl font-medium">
            404: Transfer not found
          </div> :
          !data ?
            <div className="h-32 flex items-center justify-center">
              <TailSpin
                width="32"
                height="32"
                color={loaderColor(theme)}
              />
            </div> :
            <>
              <div className="max-w-8xl bg-slate-200 dark:bg-slate-900 bg-opacity-40 dark:bg-opacity-75 overflow-x-auto rounded-lg sm:flex sm:items-center sm:justify-between space-y-8 sm:space-y-0 sm:space-x-8 mx-auto py-10 px-3 sm:py-8 sm:px-6">
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
                        <TailSpin
                          width="32"
                          height="32"
                          color={loaderColor(theme)}
                        />
                      </div>
                    }
                    {xcall_caller && (
                      <div className="flex items-center justify-center sm:justify-start space-x-1.5">
                        <a
                          href={source_chain_data?.explorer?.url ? `${source_chain_data.explorer.url}${source_chain_data.explorer.address_path?.replace('{address}', xcall_caller)}` : `/address/${xcall_caller}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <EnsProfile
                            address={xcall_caller}
                            noCopy={true}
                            fallback={
                              <span className="text-slate-400 dark:text-slate-600 font-semibold">
                                <span className="sm:hidden">
                                  {ellipse(xcall_caller, 8)}
                                </span>
                                <span className="hidden sm:block">
                                  {ellipse(xcall_caller, 12)}
                                </span>
                              </span>
                            }
                          />
                        </a>
                        <Copy size={20} value={xcall_caller} />
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <div className="flex items-center justify-center sm:justify-start xl:justify-center space-x-1 sm:space-x-2">
                      {source_asset_image && (
                        <Image
                          src={source_asset_image}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      {source_amount >= 0 ?
                        <DecimalsFormat
                          value={source_amount}
                          className="text-lg font-semibold"
                        /> :
                        <TailSpin
                          width="32"
                          height="32"
                          color={loaderColor(theme)}
                        />
                      }
                      {source_asset_data && (
                        <>
                          {source_symbol && (
                            <span className="text-base font-medium">
                              {source_symbol}
                            </span>
                          )}
                          <AddToken token_data={{ ...source_asset_data }} />
                        </>
                      )}
                    </div>
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
                          <Tooltip
                            placement="top"
                            content={error_status === XTransferErrorStatus.NoBidsReceived ? 'The transaction will complete within 120 minutes.' : bumped ? 'Processing' : error_status}
                            className="z-50 bg-dark text-white text-xs"
                          >
                            <div className={`flex items-center ${error_status === XTransferErrorStatus.NoBidsReceived ? 'text-slate-600 dark:text-slate-200' : 'text-red-600 dark:text-red-500'} space-x-1`}>
                              {!bumped && (
                                error_status === XTransferErrorStatus.NoBidsReceived ?
                                  <MdInfoOutline size={24} /> :
                                  <IoWarning size={24} />
                              )}
                              <span className={`normal-case ${bumped ? 'text-blue-500 dark:text-blue-300' : ''} text-base font-bold`}>
                                {[XTransferErrorStatus.ExecutionError].includes(error_status) ? error_status : error_status === XTransferErrorStatus.NoBidsReceived ? 'Boost liquidity not available' : bumped ? 'Processing' : error_status}
                              </span>
                            </div>
                          </Tooltip>
                        }
                        onTransferBumped={
                          relayer_fee_data => {
                            if (data) {
                              setData({ ...data, ...relayer_fee_data, error_status: null, pending: true, errored: false })
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
                        <div className="flex items-center text-blue-500 dark:text-blue-300 space-x-2">
                          <span className="text-base font-medium">
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
                      <TailSpin
                        width="32"
                        height="32"
                        color={loaderColor(theme)}
                      />
                    </div>
                  }
                  <TimeSpent
                    title="Time spent"
                    fromTime={xcall_timestamp}
                    toTime={execute_timestamp}
                    className={`${errored ? error_status === XTransferErrorStatus.NoBidsReceived ? 'text-slate-600 dark:text-slate-200' : 'text-red-600 dark:text-red-500' : pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'} font-semibold`}
                  />
                </div>
                <div className="grid grid-cols-1 xl:grid-cols-2 items-center gap-8 sm:gap-4 xl:gap-8">
                  <div className="order-1 sm:order-2 xl:order-1 flex flex-col sm:items-end">
                    <div className="flex items-center justify-center sm:justify-end xl:justify-center space-x-1 sm:space-x-2">
                      {destination_asset_image && (
                        <Image
                          src={destination_asset_image}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      {destination_amount >= 0 ?
                        <DecimalsFormat
                          value={destination_amount}
                          className="text-lg font-semibold"
                        /> :
                        <TailSpin
                          width="32"
                          height="32"
                          color={loaderColor(theme)}
                        />
                      }
                      {destination_asset_data && (
                        <>
                          {destination_symbol && (
                            <span className="text-base font-medium">
                              {destination_symbol}
                            </span>
                          )}
                          <AddToken token_data={{ ...destination_asset_data }} />
                        </>
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
                        <TailSpin
                          width="32"
                          height="32"
                          color={loaderColor(theme)}
                        />
                      </div>
                    }
                    {to && (
                      <div className="flex items-center justify-center sm:justify-end space-x-1.5">
                        <a
                          href={destination_chain_data?.explorer?.url ? `${destination_chain_data.explorer.url}${destination_chain_data.explorer.address_path?.replace('{address}', to)}` : `/address/${to}`}
                          target="_blank"
                          rel="noopener noreferrer"
                        >
                          <EnsProfile
                            address={to}
                            noCopy={true}
                            fallback={
                              <span className="text-slate-400 dark:text-slate-600 font-semibold">
                                <span className="sm:hidden">
                                  {ellipse(to, 8)}
                                </span>
                                <span className="hidden sm:block">
                                  {ellipse(to, 12)}
                                </span>
                              </span>
                            }
                          />
                        </a>
                        <Copy size={20} value={to} />
                      </div>
                    )}
                  </div>
                </div>
              </div>
              <div className="grid grid-flow-row md:grid-cols-2 xl:grid-cols-3 gap-3 sm:gap-6">
                {details
                  .filter(s => data[`${s}_transaction_hash`] || !['reconcile'].includes(s))
                  .map((s, i) => (
                    <div key={i} className={`form ${s === 'reconcile' ? 'bg-slate-100 dark:bg-gray-900 bg-opacity-100 dark:bg-opacity-50' : 'bg-slate-200 dark:bg-slate-900 bg-opacity-40 dark:bg-opacity-75'} rounded-lg space-y-5 py-10 px-4 sm:py-8 sm:px-6`}>
                      <div className="flex items-center justify-between">
                        <Tooltip
                          placement="top"
                          content={
                            s === 'xcall' ?
                              'assets sent by user on origin chain' :
                              s === 'execute' ?
                                'assets delivered to user on destination chain' :
                                s === 'reconcile' ?
                                  'assets minted to router' :
                                  null
                          }
                          className="z-50 bg-black text-white text-xs"
                        >
                          <span className={`${s === 'reconcile' ? 'bg-slate-200 dark:bg-slate-800 text-black dark:text-white text-xl' : 'bg-blue-400 dark:bg-blue-600 text-white text-xl'} rounded-lg capitalize tracking-wider font-medium py-1 px-3`}>
                            {s === 'xcall' ? 'send' : s === 'execute' ? 'receive' : s}
                          </span>
                        </Tooltip>
                        <div className="flex items-center space-x-4">
                          {s === 'xcall' && (
                            <>
                              {call_data && call_data !== '0x' && (
                                <Tooltip
                                  placement="top"
                                  content={call_data !== '0x' ? 'Has calldata' : 'No calldata'}
                                  className="z-50 bg-dark text-white text-xs"
                                >
                                  <div className="flex items-center">
                                    <AiTwotoneFile
                                      size={24}
                                      className={call_data !== '0x' ? 'text-yellow-500 dark:text-yellow-400' : 'text-slate-400 dark:text-slate-500'}
                                    />
                                    <BiInfoCircle
                                      size={14}
                                      className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                    />
                                  </div>
                                </Tooltip>
                              )}
                              {call_data === '0x' && (routers?.length > 0 || !(execute_transaction_hash || errored)) && (
                                <Tooltip
                                  placement="top"
                                  content={routers?.length > 0 ? 'Boosted by routers.' : 'Pending router boost.'}
                                  className="z-50 bg-dark text-white text-xs"
                                >
                                  <div className="flex items-center">
                                    <BsLightningChargeFill
                                      size={24}
                                      className={routers?.length > 0 ? 'text-yellow-500 dark:text-yellow-400' : 'text-blue-300 dark:text-blue-200'}
                                    />
                                    <BiInfoCircle
                                      size={14}
                                      className="block sm:hidden text-slate-400 dark:text-slate-500 ml-1 sm:ml-0"
                                    />
                                  </div>
                                </Tooltip>
                              )}
                            </>
                          )}
                          {data[`${s}_transaction_hash`] ?
                            <HiCheckCircle
                              size={32}
                              className="bg-slate-100 dark:bg-slate-200 rounded-full text-green-500 dark:text-green-500"
                            /> :
                            errored ?
                              s === 'execute' ?
                                <ActionRequired
                                  forceDisabled={[XTransferErrorStatus.ExecutionError, XTransferErrorStatus.NoBidsReceived].includes(error_status) || bumped}
                                  transferData={data}
                                  buttonTitle={
                                    <Tooltip
                                      placement="top"
                                      content={error_status === XTransferErrorStatus.NoBidsReceived ? 'The transaction will complete within 120 minutes.' : bumped ? 'Processing' : error_status}
                                      className="z-50 bg-dark text-white text-xs"
                                    >
                                      <div>
                                        {bumped ?
                                          <TailSpin
                                            width="32"
                                            height="32"
                                            color={loaderColor(theme)}
                                          /> :
                                          error_status === XTransferErrorStatus.NoBidsReceived ?
                                            <MdInfoOutline size={24} className="text-slate-400 dark:text-slate-500" /> :
                                            <IoWarning
                                              size={32}
                                              className="text-red-600 dark:text-red-500"
                                            />
                                        }
                                      </div>
                                    </Tooltip>
                                  }
                                  onTransferBumped={
                                    relayer_fee_data => {
                                      if (data) {
                                        setData({ ...data, ...relayer_fee_data, error_status: null, pending: true, errored: false })
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
                                <TailSpin
                                  width="32"
                                  height="32"
                                  color={loaderColor(theme)}
                                />
                          }
                        </div>
                      </div>
                      {data[`${s}_transaction_hash`] && (
                        toArray(
                          _.concat(
                            [
                              'transaction_hash',
                              'block_number',
                              'timestamp',
                              ['reconcile'].includes(s) ? 'message_status' : undefined,
                              'caller',
                              ['xcall'].includes(s) ? 'to' : undefined,
                              ['xcall'].includes(s) ? 'recovery' : s === 'execute' ? 'origin_sender' : undefined,
                              ['xcall'].includes(s) ? 'relayer_fee' : undefined,
                              'gas_price',
                              'gas_limit',
                              ['xcall'].includes(s) && call_data && call_data !== '0x' ? 'call_data' : undefined,
                            ],
                            ['execute'].includes(s) ? ['simulation_from', 'simulation_to', 'simulation_network', 'simulation_input'] : undefined,
                          )
                        )
                        .map(((f, j) => (
                          <div key={j} className="space-y-1">
                            <div className="form-label tracking-wider capitalize text-slate-400 dark:text-slate-600 text-base font-normal">
                              {split(f, 'normal', '_').join(' ')}
                            </div>
                            <div className="form-element">
                              {[undefined, null].includes(data[['message_status', 'recovery', 'to', 'relayer_fee', 'call_data'].includes(f) ? f === 'relayer_fee' && Object.keys({ ...data[`${f}s`] }).length > 0 ? `${f}s` : f : `${s}_${f}`]) ?
                                <span className="text-slate-600 dark:text-slate-200">-</span> :
                                toArray(data[['message_status', 'recovery', 'to', 'relayer_fee', 'call_data'].includes(f) ? f === 'relayer_fee' && Object.keys({ ...data[`${f}s`] }).length > 0 ? `${f}s` : f : `${s}_${f}`]).map((v, k) => {
                                  const {
                                    provider_params,
                                    explorer,
                                  } = { ...s === 'xcall' ? source_chain_data : destination_chain_data }

                                  const {
                                    nativeCurrency,
                                  } = { ..._.head(provider_params) }

                                  const {
                                    url,
                                    block_path,
                                    transaction_path,
                                    address_path,
                                  } = { ...explorer }

                                  const {
                                    symbol,
                                    decimals,
                                  } = { ...nativeCurrency }

                                  let _v
                                  let component

                                  switch (f) {
                                    case 'transaction_hash':
                                      _v = (
                                        <>
                                          <span className="lg:hidden">
                                            {ellipse(v, 14)}
                                          </span>
                                          <span className="hidden lg:block">
                                            {ellipse(v, 16)}
                                          </span>
                                        </>
                                      )

                                      component = (
                                        <div className="flex items-center space-x-2">
                                          {url ?
                                            <a
                                              href={`${url}${transaction_path?.replace('{tx}', v)}`}
                                              target="_blank"
                                              rel="noopener noreferrer"
                                              className="text-blue-500 dark:text-blue-600"
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
                                      _v = (
                                        <DecimalsFormat
                                          value={v}
                                          className="text-base font-medium"
                                        />
                                      )

                                      component =
                                        url ?
                                          <a
                                            href={`${explorer.url}${block_path?.replace('{block}', v)}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="text-blue-500 dark:text-blue-600"
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
                                      _v = (
                                        <EnsProfile
                                          address={v}
                                          noCopy={true}
                                          fallback={
                                            <>
                                              <span className="lg:hidden">
                                                {ellipse(v, 10)}
                                              </span>
                                              <span className="hidden lg:block">
                                                {ellipse(v, 12)}
                                              </span>
                                            </>
                                          }
                                        />
                                      )

                                      component =
                                        v ?
                                          <div className="flex items-center space-x-2">
                                            {url ?
                                              <a
                                                href={`${url}${address_path?.replace('{address}', v)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 dark:text-blue-600"
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
                                      _v = (
                                        <EnsProfile
                                          address={v}
                                          noCopy={true}
                                          fallback={
                                            <>
                                              <span className="lg:hidden">
                                                {ellipse(v, 10)}
                                              </span>
                                              <span className="hidden lg:block">
                                                {ellipse(v, 12)}
                                              </span>
                                            </>
                                          }
                                        />
                                      )

                                      component =
                                        v ?
                                          <div className="flex items-center space-x-2">
                                            {destination_chain_data?.explorer?.url ?
                                              <a
                                                href={`${destination_chain_data.explorer.url}${destination_chain_data.explorer.address_path?.replace('{address}', v)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 dark:text-blue-600"
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
                                      _v = (
                                        <EnsProfile
                                          address={v}
                                          noCopy={true}
                                          fallback={
                                            <>
                                              <span className="lg:hidden">
                                                {ellipse(v, 10)}
                                              </span>
                                              <span className="hidden lg:block">
                                                {ellipse(v, 12)}
                                              </span>
                                            </>
                                          }
                                        />
                                      )

                                      component =
                                        v ?
                                          <div className="flex items-center space-x-2">
                                            {source_chain_data?.explorer?.url ?
                                              <a
                                                href={`${source_chain_data.explorer.url}${source_chain_data.explorer.address_path?.replace('{address}', v)}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="text-blue-500 dark:text-blue-600"
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
                                                <span
                                                  key={k}
                                                  className="whitespace-nowrap text-slate-800 dark:text-slate-200 font-semibold space-x-1.5"
                                                >
                                                  <DecimalsFormat
                                                    value={utils.formatUnits(v || '0', k === constants.AddressZero ? source_gas_decimals : source_decimals)}
                                                    className="text-sm"
                                                  />
                                                  <span>
                                                    {k === constants.AddressZero ? source_gas_native_token?.symbol : source_symbol}
                                                  </span>
                                                </span>
                                              )
                                            })}
                                          </div>
                                        )
                                      }
                                      else {
                                        _v = utils.formatUnits(BigInt(v || '0'), decimals || 18),

                                        component = (
                                          <div className="flex items-center space-x-1">
                                            <DecimalsFormat
                                              value={Number(_v) <= 0 ? 0 : _v}
                                              className="text-base"
                                            />
                                            <span>
                                              {symbol}
                                            </span>
                                          </div>
                                        )
                                      }
                                      break
                                    case 'gas_price':
                                      component = (
                                        <div className="flex items-center space-x-1">
                                          <span>
                                            {utils.formatUnits(v, 'gwei')}
                                          </span>
                                          <span>Gwei</span>
                                        </div>
                                      )
                                      break
                                    case 'call_data':
                                    case 'simulation_input':
                                      component =
                                        v ?
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
                                      component = !isNaN(v) ? <DecimalsFormat value={v} className="text-base" /> : v
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
                  ))
                }
              </div>
            </>
        }
      </div>
    </div>
  )
}