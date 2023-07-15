import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { ResponsiveContainer, BarChart, linearGradient, stop, XAxis, Bar, LabelList, Cell, Tooltip } from 'recharts'
import _ from 'lodash'

import Spinner from '../../spinner'
import NumberDisplay from '../../number'
import Image from '../../image'
import { toArray, numberFormat } from '../../../lib/utils'

export default ({ title = 'TVL', description = 'Total value locked by chain' }) => {
  const { router_asset_balances, pools } = useSelector(state => ({ router_asset_balances: state.router_asset_balances, pools: state.pools }), shallowEqual)
  const { router_asset_balances_data } = { ...router_asset_balances }
  const { pools_data } = { ...pools }

  const router = useRouter()

  const [data, setData] = useState(null)
  const [x, setX] = useState(null)

  useEffect(
    () => {
      if (router_asset_balances_data) {
        setData(
          Object.values(router_asset_balances_data).map(v => {
            const { chain_data } = { ..._.head(v) }
            const { id } = { ...chain_data }
            const router_value = _.sumBy(v, 'value')
            const pool_value = _.sumBy(toArray(pools_data).filter(d => d.chain_data?.id === id), 'tvl') || 0
            return {
              ...chain_data,
              router_value,
              pool_value,
              value: router_value + pool_value,
            }
          })
          .filter(d => d.id)
          .map(d => {
            const { router_value, pool_value, value } = { ...d }
            return {
              ...d,
              value_string: numberFormat(value, '0,0.00a'),
              values: [
                { id: 'Routers', value: router_value },
                { id: 'Pools', value: pool_value },
              ],
            }
          })
        )
      }
    },
    [router_asset_balances_data, pools_data],
  )

  const CustomTooltip = ({ active, payload }) => {
    if (active) {
      const { values } = { ..._.head(payload)?.payload }
      return toArray(values).length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800 dark:bg-opacity-75 border border-slate-200 dark:border-slate-800 flex flex-col space-y-2 p-2">
          {toArray(values).filter(d => d.value).map((d, i) => {
            const { id, value } = { ...d }
            return (
              <div key={i} className="flex items-center justify-between space-x-4">
                <span className="text-xs font-semibold">
                  {id}
                </span>
                <NumberDisplay
                  value={value}
                  prefix="$"
                  noTooltip={true}
                  className="text-xs font-semibold"
                />
              </div>
            )
          })}
        </div>
      )
    }
    else {
      return null
    }
  }

  const d = toArray(data).find(d => d.id === x)
  const { id, name, image, value } = { ...d }
  const gradient_id = 'gradient-tvl'

  return (
    <div className="h-80 bg-white dark:bg-slate-900 rounded space-y-2 pt-5 pb-0 sm:pb-1 px-5">
      <div className="flex items-center justify-between space-x-1">
        <div className="flex flex-col space-y-0.5">
          <span className="3xl:text-2xl font-semibold">
            {title}
          </span>
          {description && (
            <span className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl">
              {description}
            </span>
          )}
        </div>
        {d && (
          <div className="flex flex-col items-end space-y-0.5">
            <NumberDisplay
              value={value}
              format="0,0"
              maxDecimals={0}
              prefix="$"
              noTooltip={true}
              className="text-base 3xl:text-2xl font-bold"
            />
            <div className="flex items-center space-x-2">
              {image && (
                <Image
                  src={image}
                  width={18}
                  height={18}
                  className="3xl:w-6 3xl:h-6 rounded-full"
                />
              )}
              <span className="text-xs 3xl:text-xl font-medium">
                {name}
              </span>
            </div>
          </div>
        )}
      </div>
      <div className="w-full h-64">
        {data ?
          <ResponsiveContainer>
            <BarChart
              data={data}
              onMouseEnter={e => setX(_.head(e?.activePayload)?.payload?.timestamp)}
              onMouseMove={e => setX(_.head(e?.activePayload)?.payload?.timestamp)}
              onMouseLeave={() => setX(null)}
              margin={{ top: 20, right: 2, bottom: 4, left: 2 }}
              className="small-x"
            >
              <defs>
                {data.map((d, i) => {
                  const { id, color } = { ...d }
                  return (
                    <linearGradient key={i} id={`${gradient_id}-${id}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="25%" stopColor={color} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.75} />
                    </linearGradient>
                  )
                })}
              </defs>
              <XAxis dataKey="short_name" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              <Bar dataKey="value" minPointSize={10} onClick={d => router.push(`/${id}`)}>
                <LabelList
                  dataKey="value_string"
                  position="top"
                  cursor="default"
                  className="uppercase font-semibold"
                />
                {data.map((d, i) => {
                  const { id } = { ...d }
                  return (
                    <Cell
                      key={i}
                      cursor="pointer"
                      fillOpacity={1}
                      fill={`url(#${gradient_id}-${id})`}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer> :
          <div className="w-full h-4/5 flex items-center justify-center">
            <Spinner width={32} height={32} />
          </div>
        }
      </div>
    </div>
  )
}