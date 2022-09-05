import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'

import Image from '../../image'
import { currency_symbol } from '../../../lib/object/currency'
import { number_format, loader_color } from '../../../lib/utils'

export default () => {
  const { preferences, asset_balances } = useSelector(state => ({ preferences: state.preferences, asset_balances: state.asset_balances }), shallowEqual)
  const { theme } = { ...preferences }
  const { asset_balances_data } = { ...asset_balances }

  const [data, setData] = useState(null)

  useEffect(() => {
    if (asset_balances_data) {
      setData({
        total: _.sumBy(
          Object.values(asset_balances_data)
            .flatMap(l => l),
          'value',
        ),
        top_chains: _.slice(
          _.orderBy(
            Object.values(asset_balances_data)
              .map(v => {
                return {
                  ..._.head(v)?.chain_data,
                  value: _.sumBy(
                    v,
                    'value',
                  ),
                }
              }),
            ['value'],
            ['desc'],
          ),
          0,
          3,
        ),
        top_assets: _.slice(
          _.orderBy(
            Object.values(
              _.groupBy(
                Object.values(asset_balances_data)
                  .flatMap(l => l),
                'asset_data.id',
              )
            )
            .map(v => {
              return {
                ..._.head(v)?.asset_data,
                value: _.sumBy(
                  v,
                  'value',
                ),
              }
            }),
            ['value'],
            ['desc'],
          ),
          0,
          3,
        ),
      })
    }
  }, [asset_balances_data])

  const {
    total,
    top_chains,
    top_assets,
  } = { ...data }

  return (
    <div className="h-80 bg-white dark:bg-black border border-slate-100 dark:border-slate-800 shadow dark:shadow-slate-400 rounded-lg space-y-0.5 p-5">
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
                    total > 10000000 ?
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
                      alt=""
                      width={32}
                      height={32}
                    />
                  </div>
                  <div className="hidden dark:flex items-center">
                    <Image
                      src="/logos/logo_white.png"
                      alt=""
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
                {top_chains?.filter(c => c?.image).map((c, i) => (
                  <Link
                    key={i}
                    href={`/${c.id}`}
                  >
                    <a className="flex items-center">
                      <Image
                        src={c.image}
                        alt=""
                        title={c.name}
                        width={20}
                        height={20}
                        className="rounded-full"
                      />
                    </a>
                  </Link>
                ))}
              </div>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <span className="uppercase text-slate-400 dark:text-slate-200 font-bold">
                Top 3 tokens
              </span>
              <div className="flex items-center space-x-1.5">
                {top_assets?.filter(a => a?.symbol).map((a, i) => (
                  <div
                    key={i}
                    className="bg-slate-50 dark:bg-slate-800 rounded-lg flex items-center space-x-1 py-0.5 px-1.5"
                  >
                    {a.image && (
                      <Image
                        src={a.image}
                        alt=""
                        title={a.symbol}
                        width={16}
                        height={16}
                        className="rounded-full"
                      />
                    )}
                    <span className="text-sm font-semibold">
                      {a.symbol}
                    </span>
                  </div>
                ))}
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