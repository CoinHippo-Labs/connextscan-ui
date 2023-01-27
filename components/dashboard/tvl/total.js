import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'

import Image from '../../image'
import { currency_symbol } from '../../../lib/object/currency'
import { number_format, loader_color } from '../../../lib/utils'

export default () => {
  const {
    preferences,
    asset_balances,
    pools,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        asset_balances: state.asset_balances,
        pools: state.pools,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    asset_balances_data,
  } = { ...asset_balances }
  const {
    pools_data,
  } = { ...pools }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      if (asset_balances_data) {
        setData(
          {
            total:
              _.sumBy(
                Object.values(asset_balances_data)
                  .flatMap(l => l),
                'value',
              ) +
              (
                _.sumBy(
                  pools_data ||
                  [],
                  'tvl',
                ) ||
                0
              ),
            top_chains:
              _.slice(
                _.orderBy(
                  Object.values(asset_balances_data)
                    .map(v => {
                      const {
                        chain_data,
                      } = {  
                        ...(
                          _.head(v)
                        ),
                      }

                      const router_value =
                        _.sumBy(
                          v,
                          'value',
                        )

                      const pool_value =
                        _.sumBy(
                          (pools_data || [])
                            .filter(p =>
                              p?.chain_data?.id === chain_data?.id
                            ),
                          'tvl',
                        ) ||
                        0

                      return {
                        ...chain_data,
                        router_value,
                        pool_value,
                        value: router_value + pool_value,
                      }
                    }),
                  ['value'],
                  ['desc'],
                ),
                0,
                3,
              ),
            top_assets:
              _.slice(
                _.orderBy(
                  Object.values(
                    _.groupBy(
                      Object.values(asset_balances_data)
                        .flatMap(l => l),
                      'asset_data.id',
                    )
                  )
                  .map(v => {
                    const {
                      asset_data,
                    } = {  
                      ...(
                        _.head(v)
                      ),
                    }

                    const router_value =
                      _.sumBy(
                        v,
                        'value',
                      )

                    const pool_value =
                      _.sumBy(
                        (pools_data || [])
                          .filter(p =>
                            p?.asset_data?.id === asset_data?.id
                          ),
                        'tvl',
                      ) ||
                      0

                    return {
                      ...asset_data,
                      router_value,
                      pool_value,
                      value: router_value + pool_value,
                    }
                  }),
                  ['value'],
                  ['desc'],
                ),
                0,
                3,
              ),
          }
        )
      }
    },
    [asset_balances_data, pools_data],
  )

  const {
    total,
    top_chains,
    top_assets,
  } = { ...data }

  return (
    <div className="h-80 bg-white dark:bg-slate-900 dark:bg-opacity-75 border border-slate-100 dark:border-slate-900 rounded-lg space-y-0.5 p-5">
      {data ?
        <div className="space-y-4">
          <div className="text-center py-12">
            <div className="space-y-2 pt-6 pb-3">
              <div className="uppercase text-4xl font-extrabold">
                {currency_symbol}
                {number_format(
                  total,
                  total > 50000000 ?
                    '0,0.00a' :
                    total > 1000 ?
                      '0,0' :
                      '0,0.00',
                )}
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-slate-400 dark:text-white text-base font-bold">
                  TVL on
                </span>
                <div>
                  <div className="flex dark:hidden items-center">
                    <Image
                      src="/logos/logo.png"
                      width={32}
                      height={32}
                    />
                  </div>
                  <div className="hidden dark:flex items-center">
                    <Image
                      src="/logos/logo_white.png"
                      width={32}
                      height={32}
                    />
                  </div>
                </div>
                <span className="text-slate-400 dark:text-white text-base font-bold">
                  Connext
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <span className="uppercase text-slate-400 dark:text-slate-200 font-bold">
                Top 3 chains
              </span>
              <div className="flex items-center space-x-1.5">
                {
                  (Array.isArray(top_chains) ?
                    top_chains :
                    []
                  )
                  .filter(c => c?.image)
                  .map((c, i) => {
                    const {
                      id,
                      name,
                      image,
                    } = { ...c }

                    return (
                      <Link
                        key={i}
                        href={`/${id}`}
                      >
                        <a className="flex items-center">
                          <Image
                            src={image}
                            title={name}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        </a>
                      </Link>
                    )
                  })
                }
              </div>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <span className="uppercase text-slate-400 dark:text-slate-200 font-bold">
                Top 3 tokens
              </span>
              <div className="flex items-center space-x-1.5">
                {
                  (Array.isArray(top_assets) ?
                    top_assets :
                    []
                  )
                  .filter(a => a?.symbol)
                  .map((a, i) => {
                    const {
                      image,
                      symbol,
                    } = { ...a }

                    return (
                      <div
                        key={i}
                        className="bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center space-x-1 py-0.5 px-1.5"
                      >
                        <Image
                          src={image}
                          title={symbol}
                          width={16}
                          height={16}
                          className="rounded-full"
                        />
                        <span className="text-sm font-semibold">
                          {symbol}
                        </span>
                      </div>
                    )
                  })
                }
              </div>
            </div>
          </div>
        </div> :
        <div className="h-full flex items-center justify-center">
          <TailSpin
            color={loader_color(theme)}
            width="40"
            height="40"
            strokeWidth="8"
          />
        </div>
      }
    </div>
  )
}