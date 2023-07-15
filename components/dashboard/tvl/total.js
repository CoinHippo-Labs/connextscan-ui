import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Tooltip } from '@material-tailwind/react'
import _ from 'lodash'

import Spinner from '../../spinner'
import NumberDisplay from '../../number'
import Image from '../../image'
import { toArray } from '../../../lib/utils'

export default () => {
  const { router_asset_balances, pools } = useSelector(state => ({ router_asset_balances: state.router_asset_balances, pools: state.pools }), shallowEqual)
  const { router_asset_balances_data } = { ...router_asset_balances }
  const { pools_data } = { ...pools }

  const [data, setData] = useState(null)

  useEffect(
    () => {
      if (router_asset_balances_data) {
        setData({
          total: _.sumBy(Object.values(router_asset_balances_data).flatMap(d => d), 'value') + (_.sumBy(toArray(pools_data), 'tvl') || 0),
          top_chains: _.slice(
            _.orderBy(
              Object.values(router_asset_balances_data).map(v => {
                const { chain_data } = { ... _.head(v) }
                const { id } = { ...chain_data }
                const router_value = _.sumBy(v, 'value')
                const pool_value = _.sumBy(toArray(pools_data).filter(d => d.chain_data?.id === id), 'tvl') || 0
                return {
                  ...chain_data,
                  router_value,
                  pool_value,
                  value: router_value + pool_value,
                }
              }),
              ['value'], ['desc'],
            ),
            0, 5,
          ),
          top_assets: _.slice(
            _.orderBy(
              Object.values(_.groupBy(Object.values(router_asset_balances_data).flatMap(d => d), 'asset_data.id')).map(v => {
                const { asset_data } = { ..._.head(v) }
                const { id } = { ...asset_data }
                const router_value = _.sumBy(v, 'value')
                const pool_value = _.sumBy(toArray(pools_data).filter(d => d.asset_data?.id === id), 'tvl') || 0
                return {
                  ...asset_data,
                  router_value,
                  pool_value,
                  value: router_value + pool_value,
                }
              }),
              ['value'], ['desc'],
            ),
            0, 5,
          ),
        })
      }
    },
    [router_asset_balances_data, pools_data],
  )

  const { total, top_chains, top_assets } = { ...data }

  return (
    <div className="h-80 bg-white dark:bg-slate-900 dark:bg-opacity-75 rounded p-5">
      {data ?
        <div className="space-y-4">
          <div className="text-center py-12">
            <div className="space-y-2 pt-6 pb-3">
              <NumberDisplay
                value={total}
                prefix="$"
                noTooltip={true}
                className="text-4xl font-extrabold"
              />
              <div className="flex items-center justify-center space-x-2">
                <span className="text-slate-600 dark:text-white text-base font-bold">
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
                <span className="text-slate-600 dark:text-white text-base font-bold">
                  Connext
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <span className="whitespace-nowrap uppercase text-slate-400 dark:text-slate-200 font-bold">
                Top 5 chains
              </span>
              <div className="flex items-center space-x-1.5">
                {toArray(top_chains).filter(d => d.image).map((d, i) => {
                  const { id, name, image } = { ...d }
                  return (
                    <Link key={i} href={`/${id}`}>
                      <Tooltip content={name}>
                        <div className="flex items-center">
                          <Image
                            src={image}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        </div>
                      </Tooltip>
                    </Link>
                  )
                })}
              </div>
            </div>
            <div className="flex items-center justify-between space-x-2">
              <span className="whitespace-nowrap uppercase text-slate-400 dark:text-slate-200 font-bold">
                Top 5 tokens
              </span>
              <div className="flex items-center space-x-1.5">
                {toArray(top_assets).filter(d => d.symbol).map((d, i) => {
                  const { symbol, image } = { ...d }
                  return (
                    <Tooltip key={i} content={symbol}>
                      <div className="flex items-center">
                        <Image
                          src={image}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      </div>
                    </Tooltip>
                  )
                })}
              </div>
            </div>
          </div>
        </div> :
        <div className="h-full flex items-center justify-center">
          <Spinner width={40} height={40} />
        </div>
      }
    </div>
  )
}