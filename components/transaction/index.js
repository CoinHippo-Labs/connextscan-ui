import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { XTransferStatus } from '@connext/nxtp-utils'
import { TailSpin, ThreeCircles, RotatingSquare, Triangle } from 'react-loader-spinner'
import Bounce from 'react-reveal/Bounce'
import Pulse from 'react-reveal/Pulse'
import Fade from 'react-reveal/Fade'
import { VscPassFilled } from 'react-icons/vsc'

import Image from '../image'
import EnsProfile from '../ens-profile'
import AddToken from '../add-token'
import Copy from '../copy'
import { number_format, ellipse, equals_ignore_case, total_time_string, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, chains, assets, dev } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, dev: state.dev }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { sdk } = { ...dev }

  const router = useRouter()
  const { query } = { ...router }
  const { tx } = { ...query }

  const [data, setData] = useState(null)
  const [timer, setTimer] = useState(null)

  useEffect(() => {
    const getData = async is_interval => {
      if (sdk && tx && (!is_interval || !data || ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(data.status))) {
        const response = await sdk.nxtpSdkUtils.getTransferById(tx)
        if (response?.[0]) {
          const _data = response[0]
          const source_chain_data = chains_data?.find(c => c?.chain_id === Number(_data.origin_chain) || c?.domain_id === Number(_data.origin_domain))
          const source_asset_data = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === source_chain_data?.chain_id && [_data?.origin_transacting_asset, _data?.origin_bridged_asset].findIndex(_a => equals_ignore_case(_a, c?.contract_address)) > -1) > -1)
          const source_contract_data = source_asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
          const destination_chain_data = chains_data?.find(c => c?.chain_id === Number(_data.destination_chain) || c?.domain_id === Number(_data.destination_domain))
          const destination_asset_data = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === destination_chain_data?.chain_id && [_data?.destination_transacting_asset, _data?.destination_local_asset].findIndex(_a => equals_ignore_case(_a, c?.contract_address)) > -1) > -1)
          const destination_contract_data = destination_asset_data?.contracts?.find(c => c?.chain_id === destination_chain_data?.chain_id)
          setData({
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
          })
        }
        else if (!is_interval) {
          setData(false)
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(true), 0.25 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk, tx])

  useEffect(() => {
    const run = async () => {
      if (data && !data.execute_timestamp) {
        setTimer(moment().unix())
      }
    }
    if (!timer) {
      run()
    }
    const interval = setInterval(() => run(), 1 * 1000)
    return () => clearInterval(interval)
  }, [data, timer])

  const {
    status,
    source_chain_data,
    source_asset_data,
    origin_transacting_amount,
    destination_chain_data,
    destination_asset_data,
    destination_transacting_amount,
    xcall_caller,
    to,
    xcall_timestamp,
    execute_timestamp,
  } = { ...data }

  const source_symbol = source_asset_data?.symbol
  const source_decimals = source_asset_data?.contract_decimals || 18
  const source_asset_image = source_asset_data?.image
  const source_amount = ['number', 'string'].includes(typeof origin_transacting_amount) && Number(utils.formatUnits(BigNumber.from(BigInt(origin_transacting_amount).toString()), source_decimals))
  const destination_symbol = destination_asset_data?.symbol
  const destination_decimals = destination_asset_data?.contract_decimals || 18
  const destination_asset_image = destination_asset_data?.image
  const destination_amount = ['number', 'string'].includes(typeof destination_transacting_amount) && Number(utils.formatUnits(BigNumber.from(BigInt(destination_transacting_amount).toString()), destination_decimals))

  const pending = ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(data?.status)

  return (
    <div className="space-y-8 mt-4 mb-8">
      {!data && typeof data === 'boolean' ?
        <div className="h-32 flex items-center justify-center text-2xl font-bold">
          404: Transfer not found
        </div>
        :
        <>
          <div className="max-w-5xl sm:flex justify-between space-y-8 sm:space-y-0 sm:space-x-8 mx-auto">
            <Bounce left delay={0.5 * 1000}>
              <div className="space-y-2">
                {source_chain_data ?
                  <div className="flex items-center justify-center sm:justify-start space-x-3">
                    {source_chain_data.image && (
                      <Image
                        src={source_chain_data.image}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-lg font-semibold">
                      {source_chain_data.name}
                    </span>
                  </div>
                  :
                  <div className="flex items-center justify-center sm:justify-start">
                    <TailSpin color={loader_color(theme)} width="32" height="32" />
                  </div>
                }
                {xcall_caller && (
                  <div className="flex items-center justify-center sm:justify-start space-x-1.5">
                    <Link href={`/address/${xcall_caller}`}>
                      <a>
                        <EnsProfile
                          address={xcall_caller}
                          no_copy={true}
                          fallback={<span className="font-semibold">
                            <span className="sm:hidden">
                              {ellipse(xcall_caller, 8)}
                            </span>
                            <span className="hidden sm:block">
                              {ellipse(xcall_caller, 12)}
                            </span>
                          </span>}
                        />
                      </a>
                    </Link>
                    <Copy
                      value={xcall_caller}
                      size={20}
                    />
                  </div>
                )}
              </div>
            </Bounce>
            <Bounce left>
              <div className="flex flex-col">
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  {source_asset_image && (
                    <Image
                      src={source_asset_image}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  {source_amount ?
                    <span className="font-mono text-lg font-bold">
                      {number_format(source_amount, '0,0.000000', true)}
                    </span>
                    :
                    <RotatingSquare color={loader_color(theme)} width="32" height="32" />
                  }
                  <span className="text-lg font-semibold">
                    {source_symbol}
                  </span>
                  {source_asset_data && (
                    <AddToken
                      token_data={{ ...source_asset_data }}
                    />
                  )}
                </div>
              </div>
            </Bounce>
            <div className="flex flex-col items-center space-y-1.5">
              {data ?
                pending ?
                  <Pulse duration={1500} forever>
                    <div className="rounded-xl border-2 border-blue-500 dark:border-blue-300 flex items-center text-blue-500 dark:text-blue-300 space-x-2 py-1 px-2.5">
                      <span className="text-lg font-bold">
                        Transfering
                      </span>
                      <ThreeCircles color={loader_color(theme)} width="24" height="24" />
                    </div>
                  </Pulse>
                  :
                  <div className="rounded-xl border-2 border-green-500 dark:border-green-300 flex items-center text-green-500 dark:text-green-300 space-x-2 py-1 px-2.5">
                    <VscPassFilled size={28} />
                    <span className="uppercase text-lg font-bold">
                      Success
                    </span>
                  </div>
                :
                <div className="flex items-center justify-center sm:justify-start">
                  <TailSpin color={loader_color(theme)} width="32" height="32" />
                </div>
              }
              <div className={`font-mono ${pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'} text-base font-semibold`}>
                {total_time_string(xcall_timestamp, execute_timestamp || moment().unix())}
              </div>
            </div>
            <Bounce right>
              <div className="flex flex-col sm:items-end">
                <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                  {destination_asset_image && (
                    <Image
                      src={destination_asset_image}
                      alt=""
                      width={24}
                      height={24}
                      className="rounded-full"
                    />
                  )}
                  {destination_amount ?
                    <span className="font-mono text-lg font-bold">
                      {number_format(destination_amount, '0,0.000000', true)}
                    </span>
                    :
                    <RotatingSquare color={loader_color(theme)} width="32" height="32" />
                  }
                  <span className="text-lg font-semibold">
                    {destination_symbol}
                  </span>
                  {destination_asset_data && (
                    <AddToken
                      token_data={{ ...destination_asset_data }}
                    />
                  )}
                </div>
              </div>
            </Bounce>
            <Bounce right delay={0.5 * 1000}>
              <div className="space-y-2">
                {destination_chain_data ?
                  <div className="flex items-center justify-center sm:justify-end space-x-3">
                    {destination_chain_data?.image && (
                      <Image
                        src={destination_chain_data.image}
                        alt=""
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-lg font-semibold">
                      {destination_chain_data.name}
                    </span>
                  </div>
                  :
                  <div className="flex items-center justify-center sm:justify-end">
                    <TailSpin color={loader_color(theme)} width="32" height="32" />
                  </div>
                }
                {to && (
                  <div className="flex items-center justify-center sm:justify-end space-x-1.5">
                    <Link href={`/address/${to}`}>
                      <a>
                        <EnsProfile
                          address={to}
                          no_copy={true}
                          fallback={<span className="font-semibold">
                            <span className="sm:hidden">
                              {ellipse(to, 8)}
                            </span>
                            <span className="hidden sm:block">
                              {ellipse(to, 12)}
                            </span>
                          </span>}
                        />
                      </a>
                    </Link>
                    <Copy
                      value={to}
                      size={20}
                    />
                  </div>
                )}
              </div>
            </Bounce>
          </div>
          <div className="grid grid-flow-row md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-8">
            {_.concat(['xcall'], data?.force_slow ? ['reconcile', 'execute'] : ['execute', 'reconcile']).map((s, i) => (
              <Fade key={i} left delay={i * 0.2 * 1000}>
                <div className={`form rounded-3xl border-2 shadow ${!data?.[`${s}_transaction_hash`] ? 'border-blue-300 dark:border-blue-500 shadow-blue-300 dark:shadow-blue-500' : 'border-green-500 dark:border-green-400 shadow-green-500 dark:shadow-green-400'} space-y-3 pt-4 pb-5 px-6`}>
                  <div className="flex items-center justify-between pb-0.5">
                    <span className="capitalize text-3xl font-bold">
                      {s}
                    </span>
                    {s === 'reconcile' && data?.force_slow && (
                      <div className={`rounded-xl border-2 ${data?.status === XTransferStatus.CompletedSlow ? 'border-green-500 dark:border-green-300 text-green-500 dark:text-green-300' : 'border-blue-500 dark:border-blue-300 text-blue-500 dark:text-blue-300'} flex items-center space-x-2 py-1 px-2.5`}>
                        <span className="uppercase text-lg font-bold">
                          Slow
                        </span>
                      </div>
                    )}
                  </div>
                  {!data?.[`${s}_transaction_hash`] ?
                    <div className="h-108 flex items-center justify-center pb-12">
                      <Triangle color={loader_color(theme)} width="64" height="64" />
                    </div>
                    :
                    ['transaction_hash', 'block_number', 'timestamp', 'caller', s === 'xcall' ? 'recovery' : s === 'execute' ? 'origin_sender' : undefined, ['xcall', 'execute'].includes(s) ? 'relayer_fee' : undefined, 'gas_price', 'gas_limit'].filter(f => f).map(((f, j) => (
                      <div key={j} className="space-y-1">
                        <div className="form-label tracking-wider capitalize text-slate-500 dark:text-blue-200 text-base font-medium">
                          {f?.split('_').join(' ')}
                        </div>
                        <div className="form-element">
                          {data?.[['recovery'].includes(f) ? `${f}` : `${s}_${f}`] === null ?
                            <span className="text-slate-400 dark:text-slate-200">
                              -
                            </span>
                            :
                            [data?.[['recovery'].includes(f) ? `${f}` : `${s}_${f}`]].map((v, k) => {
                              const chain_data = s === 'xcall' ? data?.source_chain_data : data?.destination_chain_data
                              const native_token = chain_data?.provider_params?.[0]?.nativeCurrency
                              let _v, value_component
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
                                  value_component = (
                                    <div className="flex items-center space-x-2">
                                      {chain_data?.explorer?.url ?
                                        <a
                                          href={`${chain_data.explorer.url}${chain_data.explorer.transaction_path?.replace('{tx}', v)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-500 dark:text-blue-400"
                                        >
                                          {_v}
                                        </a>
                                        :
                                        _v
                                      }
                                      <Copy
                                        value={v}
                                        size={24}
                                      />
                                    </div>
                                  )
                                  break
                                case 'block_number':
                                  _v = number_format(v, '0,0')
                                  value_component = chain_data?.explorer?.url ?
                                    <a
                                      href={`${chain_data.explorer.url}${chain_data.explorer.block_path?.replace('{block}', v)}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-500 dark:text-blue-400"
                                    >
                                      {_v}
                                    </a>
                                    :
                                    _v
                                  break
                                case 'timestamp':
                                  value_component = moment(v * 1000).format('MMM D, YYYY H:mm:ss A')
                                  break
                                case 'caller':
                                case 'origin_sender':
                                case 'recovery':
                                  _v = (
                                    <EnsProfile
                                      address={v}
                                      no_copy={true}
                                      fallback={(
                                        <>
                                          <span className="lg:hidden">
                                            {ellipse(v, 14)}
                                          </span>
                                          <span className="hidden lg:block">
                                            {ellipse(v, 16)}
                                          </span>
                                        </>
                                      )}
                                    />
                                  )
                                  value_component = (
                                    <div className="flex items-center space-x-2">
                                      {chain_data?.explorer?.url ?
                                        <a
                                          href={`${chain_data.explorer.url}${chain_data.explorer.address_path?.replace('{address}', v)}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="text-blue-500 dark:text-blue-400"
                                        >
                                          {_v}
                                        </a>
                                        :
                                        _v
                                      }
                                      <Copy
                                        value={v}
                                        size={24}
                                      />
                                    </div>
                                  )
                                  break
                                case 'relayer_fee':
                                  value_component = (
                                    <div className="flex items-center space-x-1">
                                      <span>
                                        {number_format(utils.formatUnits(BigNumber.from(v || '0'), native_token?.decimals || 18), '0,0.000000', true)}
                                      </span>
                                      <span>
                                        {native_token?.symbol}
                                      </span>
                                    </div>
                                  )
                                  break
                                case 'gas_price':
                                  value_component = `${number_format(utils.formatUnits(v, 'gwei'), '0,0.00')} Gwei`
                                  break
                                default:
                                  value_component = typeof v === 'number' ? number_format(v, '0,0.00', true) : v
                                  break
                              }
                              return (
                                <div key={k} className="text-base font-bold">
                                  {value_component}
                                </div>
                              )
                            })
                          }
                        </div>
                      </div>
                    )))
                  }
                </div>
              </Fade>
            ))}
          </div>
        </>
      }
    </div>
  )
}