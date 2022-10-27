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
import TimeSpent from '../time-spent'
import EnsProfile from '../ens-profile'
import AddToken from '../add-token'
import Copy from '../copy'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

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
    query,
  } = { ...router }
  const {
    tx,
  } = { ...query }

  const [data, setData] = useState(null)
  const [timer, setTimer] = useState(null)

  useEffect(() => {
    const getData = async is_interval => {
      const {
        status,
      } = { ...data }

      if (
        sdk &&
        tx &&
        (
          !is_interval ||
          !data ||
          ![
            XTransferStatus.Executed,
            XTransferStatus.CompletedFast,
            XTransferStatus.CompletedSlow,
          ].includes(status)
        )
      ) {
        const response = await sdk.nxtpSdkUtils.getTransferById(
          tx,
        )

        const _data = _.head(response)

        if (_data) {
          const source_chain_data = chains_data?.find(c =>
            c?.chain_id === Number(_data.origin_chain) ||
            c?.domain_id === _data.origin_domain
          )
          const source_asset_data = assets_data?.find(a =>
            a?.contracts?.findIndex(c =>
              c?.chain_id === source_chain_data?.chain_id &&
              [
                _data?.origin_transacting_asset,
                _data?.origin_bridged_asset,
              ].findIndex(_a =>
                equals_ignore_case(_a, c?.contract_address)
              ) > -1
            ) > -1
          )
          const source_contract_data = source_asset_data?.contracts?.find(c =>
            c?.chain_id === source_chain_data?.chain_id
          )

          const destination_chain_data = chains_data?.find(c =>
            c?.chain_id === Number(_data.destination_chain) ||
            c?.domain_id === _data.destination_domain
          )
          const destination_asset_data = assets_data?.find(a =>
            a?.contracts?.findIndex(c =>
              c?.chain_id === destination_chain_data?.chain_id &&
              [
                _data?.destination_transacting_asset,
                _data?.destination_local_asset,
              ].findIndex(_a =>
                equals_ignore_case(_a, c?.contract_address)
              ) > -1
            ) > -1
          )
          const destination_contract_data = destination_asset_data?.contracts?.find(c =>
            c?.chain_id === destination_chain_data?.chain_id
          )

          setData(
            {
              ..._data,
              source_chain_data,
              destination_chain_data,
              source_asset_data: source_asset_data &&
                {
                  ...source_asset_data,
                  ...source_contract_data,
                },
              destination_asset_data: destination_asset_data &&
                {
                  ...destination_asset_data,
                  ...destination_contract_data,
                },
            }
          )
        }
        else if (!is_interval) {
          setData(false)
        }
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(true),
      0.25 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [sdk, tx])

  useEffect(() => {
    const run = async () => {
      const {
        execute_timestamp,
      } = { ...data }

      if (
        data &&
        !execute_timestamp
      ) {
        setTimer(moment().unix())
      }
    }

    if (!timer) {
      run()
    }

    const interval = setInterval(() =>
      run(),
      1 * 1000,
    )

    return () => clearInterval(interval)
  }, [data, timer])

  const {
    status,
    source_chain_data,
    source_asset_data,
    origin_transacting_amount,
    origin_bridged_amount,
    destination_chain_data,
    destination_asset_data,
    destination_transacting_amount,
    destination_local_amount,
    xcall_caller,
    to,
    xcall_timestamp,
    execute_timestamp,
    execute_transaction_hash,
  } = { ...data }
  let {
    force_slow,
  } = { ...data }

  force_slow = force_slow ||
    (status || '')
      .toLowerCase()
      .includes('slow')

  const source_symbol = source_asset_data?.symbol
  const source_decimals = source_asset_data?.decimals ||
    18
  const source_asset_image = source_asset_data?.image
  const source_amount = _.head(
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
          source_decimals,
        )
      )
    )
    .filter(a => a)
  )

  const destination_symbol = destination_asset_data?.symbol
  const destination_decimals = destination_asset_data?.decimals ||
    18
  const destination_asset_image = destination_asset_data?.image
  const destination_amount = _.head(
    [
      destination_transacting_amount,
      destination_local_amount,
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
          destination_decimals,
        )
      )
    )
    .filter(a => a)
  )
    

  const pending = ![
    XTransferStatus.Executed,
    XTransferStatus.CompletedFast,
    XTransferStatus.CompletedSlow,
  ].includes(status)

  const details =
    _.concat(
      ['xcall'],
      force_slow ?
        [
          'reconcile',
          'execute',
        ] :
        [
          'execute',
          'reconcile',
        ]
    )
    .filter(s =>
      s !== 'reconcile' ||
      execute_transaction_hash
    )

  return (
    <div className="space-y-6 mt-2 mb-6">
      {
        !data &&
        typeof data === 'boolean' ?
          <div className="h-32 flex items-center justify-center tracking-widest text-xl font-medium">
            404: Transfer not found
          </div> :
          !data ?
            <div className="h-32 flex items-center justify-center">
              <TailSpin
                color={loader_color(theme)}
                width="32"
                height="32"
              />
            </div> :
            <>
              <div className="max-w-8xl bg-slate-200 dark:bg-slate-900 bg-opacity-40 dark:bg-opacity-75 rounded-lg sm:flex sm:items-center sm:justify-between space-y-8 sm:space-y-0 sm:space-x-8 mx-auto py-10 px-3 sm:py-8 sm:px-6">
                <div className="space-y-2">
                  {source_chain_data ?
                    <div className="flex items-center justify-center sm:justify-start space-x-3">
                      {
                        source_chain_data.image &&
                        (
                          <Image
                            src={source_chain_data.image}
                            alt=""
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        )
                      }
                      <span className="text-lg font-semibold">
                        {source_chain_data.name}
                      </span>
                    </div> :
                    <div className="flex items-center justify-center sm:justify-start">
                      <TailSpin
                        color={loader_color(theme)}
                        width="32"
                        height="32"
                      />
                    </div>
                  }
                  {
                    xcall_caller &&
                    (
                      <div className="flex items-center justify-center sm:justify-start space-x-1.5">
                        <Link href={`/address/${xcall_caller}`}>
                          <a>
                            <EnsProfile
                              address={xcall_caller}
                              no_copy={true}
                              fallback={<span className="text-slate-400 dark:text-slate-600 font-semibold">
                                <span className="sm:hidden">
                                  {ellipse(
                                    xcall_caller,
                                    8,
                                  )}
                                </span>
                                <span className="hidden sm:block">
                                  {ellipse(
                                    xcall_caller,
                                    12,
                                  )}
                                </span>
                              </span>}
                            />
                          </a>
                        </Link>
                        <Copy
                          size={20}
                          value={xcall_caller}
                        />
                      </div>
                    )
                  }
                </div>
                <div className="flex flex-col">
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    {
                      source_asset_image &&
                      (
                        <Image
                          src={source_asset_image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )
                    }
                    {source_amount ?
                      <span className="text-lg font-semibold">
                        {number_format(
                          source_amount,
                          '0,0.000000',
                          true,
                        )}
                      </span> :
                      <TailSpin
                        color={loader_color(theme)}
                        width="32"
                        height="32"
                      />
                    }
                    {
                      source_asset_data &&
                      (
                        <>
                          {
                            source_symbol &&
                            (
                              <span className="text-base font-medium">
                                {source_symbol}
                              </span>
                            )
                          }
                          <AddToken
                            token_data={{
                              ...source_asset_data,
                            }}
                          />
                        </>
                      )
                    }
                  </div>
                </div>
                <div className="flex flex-col items-center space-y-1.5">
                  {data ?
                    pending ?
                      <div className="flex items-center text-blue-500 dark:text-blue-300 space-x-2">
                        <TailSpin
                          color={loader_color(theme)}
                          width="24"
                          height="24"
                        />
                        <span className="text-base font-medium">
                          Processing...
                        </span>
                      </div> :
                      <div className="flex items-center text-green-500 dark:text-green-300 space-x-1">
                        <HiCheckCircle
                          size={24}
                        />
                        <span className="uppercase text-base font-bold">
                          Success
                        </span>
                      </div> :
                    <div className="flex items-center justify-center sm:justify-start">
                      <TailSpin
                        color={loader_color(theme)}
                        width="32"
                        height="32"
                      />
                    </div>
                  }
                  <TimeSpent
                    title="Time spent"
                    from_time={xcall_timestamp}
                    to_time={execute_timestamp}
                    className={`${pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'} font-semibold`}
                  />
                </div>
                <div className="flex flex-col sm:items-end">
                  <div className="flex items-center justify-center space-x-1 sm:space-x-2">
                    {
                      destination_asset_image &&
                      (
                        <Image
                          src={destination_asset_image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )
                    }
                    {destination_amount ?
                      <span className="text-lg font-semibold">
                        {number_format(
                          destination_amount,
                          '0,0.000000',
                          true,
                        )}
                      </span> :
                      <TailSpin
                        color={loader_color(theme)}
                        width="32"
                        height="32"
                      />
                    }
                    {
                      destination_asset_data &&
                      (
                        <>
                          {
                            destination_symbol &&
                            (
                              <span className="text-base font-medium">
                                {destination_symbol}
                              </span>
                            )
                          }
                          <AddToken
                            token_data={{
                              ...destination_asset_data,
                            }}
                          />
                        </>
                      )
                    }
                  </div>
                </div>
                <div className="space-y-2">
                  {destination_chain_data ?
                    <div className="flex items-center justify-center sm:justify-end space-x-3">
                      {
                        destination_chain_data?.image &&
                        (
                          <Image
                            src={destination_chain_data.image}
                            alt=""
                            width={32}
                            height={32}
                            className="rounded-full"
                          />
                        )
                      }
                      <span className="text-lg font-semibold">
                        {destination_chain_data.name}
                      </span>
                    </div> :
                    <div className="flex items-center justify-center sm:justify-end">
                      <TailSpin
                        color={loader_color(theme)}
                        width="32"
                        height="32"
                      />
                    </div>
                  }
                  {
                    to &&
                    (
                      <div className="flex items-center justify-center sm:justify-end space-x-1.5">
                        <Link href={`/address/${to}`}>
                          <a>
                            <EnsProfile
                              address={to}
                              no_copy={true}
                              fallback={<span className="text-slate-400 dark:text-slate-600 font-semibold">
                                <span className="sm:hidden">
                                  {ellipse(
                                    to,
                                    8,
                                  )}
                                </span>
                                <span className="hidden sm:block">
                                  {ellipse(
                                    to,
                                    12,
                                  )}
                                </span>
                              </span>}
                            />
                          </a>
                        </Link>
                        <Copy
                          size={20}
                          value={to}
                        />
                      </div>
                    )
                  }
                </div>
              </div>
              <div className="grid grid-flow-row md:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-6">
                {details
                  .map((s, i) => (
                    <div
                      key={i}
                      className={`form bg-slate-200 dark:bg-slate-900 bg-opacity-40 dark:bg-opacity-75 rounded-lg space-y-5 py-10 px-4 sm:py-8 sm:px-6`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="bg-blue-400 dark:bg-blue-600 rounded-lg uppercase tracking-wider text-white text-xl font-medium py-1 px-3">
                          {s}
                        </span>
                        <div className="flex items-center space-x-4">
                          {
                            s === 'xcall' &&
                            force_slow &&
                            (
                              <div className={`rounded-xl border-2 ${status === XTransferStatus.CompletedSlow ? 'border-green-500 dark:border-green-300 text-green-500 dark:text-green-300' : 'border-blue-500 dark:border-blue-300 text-blue-500 dark:text-blue-300'} flex items-center space-x-2 py-1 px-2.5`}>
                                <span className="uppercase text-base font-semibold">
                                  Slow
                                </span>
                              </div>
                            )
                          }
                          {data[`${s}_transaction_hash`] ?
                            <HiCheckCircle
                              size={32}
                              className="bg-slate-100 dark:bg-slate-200 rounded-full text-green-500 dark:text-green-400"
                            /> :
                            <TailSpin
                              color={loader_color(theme)}
                              width="32"
                              height="32"
                            />
                          }
                        </div>
                      </div>
                      {
                        data[`${s}_transaction_hash`] &&
                        (
                          [
                            'transaction_hash',
                            'block_number',
                            'timestamp',
                            'caller',
                            s === 'xcall' ?
                              'recovery' :
                              s === 'execute' ?
                                'origin_sender' :
                                undefined,
                            [
                              'xcall',
                              'execute',
                            ].includes(s) ?
                              'relayer_fee' :
                              undefined,
                            'gas_price',
                            'gas_limit',
                          ]
                          .filter(f => f)
                          .map(((f, j) => (
                            <div
                              key={j}
                              className="space-y-1"
                            >
                              <div className="form-label tracking-wider capitalize text-slate-400 dark:text-slate-600 text-base font-normal">
                                {(f || '')
                                  .split('_')
                                  .join(' ')
                                }
                              </div>
                              <div className="form-element">
                                {
                                  data[
                                    [
                                      'recovery',
                                    ].includes(f) ?
                                      `${f}` :
                                      `${s}_${f}`
                                  ] === null ?
                                    <span className="text-slate-600 dark:text-slate-200">
                                      -
                                    </span> :
                                    [
                                      data?.[
                                        [
                                          'recovery',
                                        ].includes(f) ?
                                          `${f}` :
                                          `${s}_${f}`
                                      ]
                                    ]
                                    .map((v, k) => {
                                      const chain_data = s === 'xcall' ?
                                        source_chain_data :
                                        destination_chain_data
                                      const {
                                        provider_params,
                                        explorer,
                                      } = { ...chain_data }
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

                                      let _v,
                                        component

                                      switch (f) {
                                        case 'transaction_hash':
                                          _v = (
                                            <>
                                              <span className="lg:hidden">
                                                {ellipse(
                                                  v,
                                                  14,
                                                )}
                                              </span>
                                              <span className="hidden lg:block">
                                                {ellipse(
                                                  v,
                                                  16,
                                                )}
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
                                              <Copy
                                                size={20}
                                                value={v}
                                              />
                                            </div>
                                          )
                                          break
                                        case 'block_number':
                                          _v = number_format(
                                            v,
                                            '0,0',
                                          )

                                          component = url ?
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
                                          _v = (
                                            <EnsProfile
                                              address={v}
                                              no_copy={true}
                                              fallback={(
                                                <>
                                                  <span className="lg:hidden">
                                                    {ellipse(
                                                      v,
                                                      10,
                                                    )}
                                                  </span>
                                                  <span className="hidden lg:block">
                                                    {ellipse(
                                                      v,
                                                      12,
                                                    )}
                                                  </span>
                                                </>
                                              )}
                                            />
                                          )

                                          component = (
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
                                              <Copy
                                                size={20}
                                                value={v}
                                              />
                                            </div>
                                          )
                                          break
                                        case 'relayer_fee':
                                          component = (
                                            <div className="flex items-center space-x-1">
                                              <span>
                                                {number_format(
                                                  utils.formatUnits(
                                                    BigNumber.from(v || '0'),
                                                    decimals || 18,
                                                  ),
                                                  '0,0.000000',
                                                  true,
                                                )}
                                              </span>
                                              <span>
                                                {symbol}
                                              </span>
                                            </div>
                                          )
                                          break
                                        case 'gas_price':
                                          component = (
                                            <div className="flex items-center space-x-1">
                                              <span>
                                                {number_format(
                                                  utils.formatUnits(
                                                    v,
                                                    'gwei',
                                                  ),
                                                  '0,0.00',
                                                  true,
                                                )}
                                              </span>
                                              <span>
                                                Gwei
                                              </span>
                                            </div>
                                          )
                                          break
                                        default:
                                          component = !isNaN(v) ?
                                            number_format(
                                              v,
                                              '0,0.00',
                                              true,
                                            ) :
                                            v
                                          break
                                      }

                                      return (
                                        <div
                                          key={k}
                                          className="text-base font-medium"
                                        >
                                          {component}
                                        </div>
                                      )
                                    })
                                }
                              </div>
                            </div>
                          )))
                        )
                      }
                    </div>
                  ))
                }
              </div>
            </>
      }
    </div>
  )
}