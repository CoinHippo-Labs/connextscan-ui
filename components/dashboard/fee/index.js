import { useState, useEffect } from 'react'
import { ResponsiveContainer, BarChart, linearGradient, stop, XAxis, Bar, Cell, Tooltip } from 'recharts'
import _ from 'lodash'
import moment from 'moment'

import Spinner from '../../spinner'
import NumberDisplay from '../../number'
import Image from '../../image'
import { TIMEFRAMES } from '../../../lib/object'
import { toArray, numberFormat } from '../../../lib/utils'

export default (
  {
    title = 'Fee',
    description = 'Transfer fee by',
    timeframe = null,
    stacked = false,
    fees,
  },
) => {
  const [data, setData] = useState(null)
  const [x, setX] = useState(null)

  useEffect(
    () => {
      if (fees) {
        const t = TIMEFRAMES.find(d => d.day === timeframe)
        setData(
          fees.map(d => {
            const { timestamp, fee, fee_by_chains } = { ...d }
            return {
              ...d,
              id: timestamp,
              time_string: `${moment(timestamp).startOf(t?.timeframe).format('MMM D, YYYY')}${t?.timeframe === 'week' ? ` - ${moment(timestamp).endOf(t?.timeframe).format('MMM D, YYYY')}` : ''}`,
              short_name: moment(timestamp).startOf(t?.timeframe).format('D MMM'),
              value: fee,
              value_string: numberFormat(fee, '0,0.00a'),
              values: fee_by_chains,
              ...Object.fromEntries(
                toArray(fee_by_chains).map(d => {
                  const { id, fee } = { ...d }
                  return [id, fee]
                })
              ),
            }
          })
        )
      }
      else {
        setData(null)
      }
    },
    [fees],
  )

  const CustomTooltip = ({ active, payload }) => {
    if (active) {
      const { values } = { ..._.head(payload)?.payload }
      return toArray(values).length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800 dark:bg-opacity-75 border border-slate-200 dark:border-slate-800 flex flex-col space-y-2 p-2">
          {toArray(values).map((d, i) => {
            const { chain_data, fee } = { ...d }
            const { name, image } = { ...chain_data }
            return (
              <div key={i} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-1.5">
                  {image && (
                    <Image
                      src={image}
                      width={18}
                      height={18}
                      className="rounded-full"
                    />
                  )}
                  <span className="text-xs font-semibold">
                    {name}
                  </span>
                </div>
                <NumberDisplay
                  value={fee}
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

  const d = toArray(data).find(d => d.id === x) || _.last(data)
  const { time_string, value, values } = { ...d }
  const gradient_id = 'gradient-fee'

  return (
    <div className="h-80 bg-white dark:bg-slate-900 rounded space-y-2 pt-5 pb-0 sm:pb-1 px-5">
      <div className="flex items-center justify-between space-x-1">
        <div className="flex flex-col space-y-0.5">
          <span className="3xl:text-2xl font-semibold">
            {title}
          </span>
          {description && (
            <span className="text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl">
              {description} {TIMEFRAMES.find(d => d.day === timeframe)?.timeframe}
            </span>
          )}
        </div>
        {d && (
          <div className="flex flex-col items-end space-y-0.5">
            <NumberDisplay
              value={value}
              prefix="$"
              noTooltip={true}
              className="text-base 3xl:text-2xl font-bold"
            />
            <span className="whitespace-nowrap text-slate-400 dark:text-slate-200 text-xs 3xl:text-xl font-medium text-right">
              {time_string}
            </span>
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
              margin={{ top: 10, right: 2, bottom: 4, left: 2 }}
              className="small-x"
            >
              <defs>
                <linearGradient id={gradient_id} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="25%" stopColor="#eab308" stopOpacity={0.95} />
                  <stop offset="100%" stopColor="#eab308" stopOpacity={0.75} />
                </linearGradient>
              </defs>
              <XAxis dataKey="short_name" axisLine={false} tickLine={false} />
              {stacked && toArray(values).length > 0 ?
                <>
                  <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
                  {_.orderBy(toArray(values), ['id'], ['asc']).map((d, i) => {
                    const { id, color } = { ...d }
                    return (
                      <Bar
                        key={i}
                        dataKey={id}
                        minPointSize={5}
                        stackId={title}
                        fill={color}
                      />
                    )
                  })}
                </> :
                <Bar dataKey="value" minPointSize={5}>
                  {data.map((d, i) => {
                    return (
                      <Cell
                        key={i}
                        fillOpacity={1}
                        fill={`url(#${gradient_id})`}
                      />
                    )
                  })}
                </Bar>
              }
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