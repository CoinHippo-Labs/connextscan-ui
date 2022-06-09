import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import {
  ResponsiveContainer,
  BarChart,
  linearGradient,
  stop,
  XAxis,
  Bar,
  LabelList,
  Cell,
  Tooltip,
} from 'recharts'
import { TailSpin } from 'react-loader-spinner'

import Image from '../../image'
import { currency_symbol } from '../../../lib/object/currency'
import { number_format, loader_color } from '../../../lib/utils'

export default ({
  title = 'TVL',
  description = 'Total value locked by chain',
}) => {
  const { preferences, asset_balances } = useSelector(state => ({ preferences: state.preferences, asset_balances: state.asset_balances }), shallowEqual)
  const { theme } = { ...preferences }
  const { asset_balances_data } = { ...asset_balances }

  const router = useRouter()

  const [data, setData] = useState(null)
  const [xFocus, setXFocus] = useState(null)

  useEffect(() => {
    if (asset_balances_data) {
      setData(Object.values(asset_balances_data).map(ls => {
        return {
          ..._.head(ls)?.chain_data,
          value: _.sumBy(ls, 'value'),
        }
      }).map(l => {
        const { value } = { ...l }
        return {
          ...l,
          value_string: number_format(value, value > 1000000 ? '0,0.00a' : value > 10000 ? '0,0' : '0,0.00'),
        }
      }))
    }
  }, [asset_balances_data])

  const d = data?.find(d => d.id === xFocus)
  const { name, image, value } = { ...d }

  return (
    <div className="h-80 bg-white dark:bg-black border border-slate-100 dark:border-slate-800 shadow dark:shadow-slate-400 rounded-lg space-y-0.5 pt-5 pb-0 sm:pb-1 px-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-0.5">
          <span className="font-bold">
            {title}
          </span>
          <span className="text-slate-400 dark:text-slate-200 text-xs font-medium">
            {description}
          </span>
        </div>
        {d && (
          <div className="flex flex-col items-end">
            <span className="uppercase font-bold">
              {currency_symbol}{number_format(value, '0,0.00')}
            </span>
            <div className="flex items-center space-x-1.5">
              {image && (
                <Image
                  src={image}
                  alt=""
                  width={18}
                  height={18}
                  className="rounded-full"
                />
              )}
              <span className="text-xs font-medium">
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
              onMouseEnter={e => {
                if (e) {
                  setXFocus(e?.activePayload?.[0]?.payload?.id)
                }
              }}
              onMouseMove={e => {
                if (e) {
                  setXFocus(e?.activePayload?.[0]?.payload?.id)
                }
              }}
              onMouseLeave={() => setXFocus(null)}
              margin={{
                top: 10,
                right: 2,
                bottom: 4,
                left: 2,
              }}
              className="small-x"
            >
              <defs>
                {data.map((d, i) => (
                  <linearGradient
                    key={i}
                    id={`gradient-tvl-${d?.id}`}
                    x1="0"
                    y1="0"
                    x2="0"
                    y2="1"
                  >
                    <stop
                      offset="25%"
                      stopColor={d?.color}
                      stopOpacity={0.95}
                    />
                    <stop
                      offset="100%"
                      stopColor={d?.color}
                      stopOpacity={0.75}
                    />
                  </linearGradient>
                ))}
              </defs>
              <XAxis
                dataKey="short_name"
                axisLine={false}
                tickLine={false}
              />
              <Bar
                dataKey="value"
                minPointSize={10}
                onClick={d => router.push(`/${d?.id}`)}
              >
                <LabelList
                  dataKey="value_string"
                  position="top"
                  cursor="default"
                />
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    cursor="pointer"
                    fillOpacity={1}
                    fill={`url(#gradient-tvl-${d?.id})`}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          :
          <div className="w-full h-4/5 flex items-center justify-center">
            <TailSpin color={loader_color(theme)} width="32" height="32" />
          </div>
        }
      </div>
    </div>
  )
}