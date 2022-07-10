import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import {
  ResponsiveContainer,
  BarChart,
  linearGradient,
  stop,
  XAxis,
  Bar,
  Cell,
} from 'recharts'
import { TailSpin } from 'react-loader-spinner'

import Image from '../../image'
import { timeframes } from '../../../lib/object/timeframe'
import { currency_symbol } from '../../../lib/object/currency'
import { number_format, loader_color } from '../../../lib/utils'

export default ({
  title = 'Volume',
  description = 'Transfer volume by',
  timeframe = null,
  volumes,
}) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const router = useRouter()

  const [data, setData] = useState(null)
  const [xFocus, setXFocus] = useState(null)

  useEffect(() => {
    if (volumes) {
      const _timeframe = timeframes.find(t => t?.day === timeframe)
      setData(volumes.map(d => {
        const {
          timestamp,
          volume,
        } = { ...d }
        return {
          ...d,
          id: timestamp,
          time_string: `${moment(timestamp).startOf(_timeframe?.timeframe).format('MMM D, YYYY')}${_timeframe?.timeframe === 'week' ? ` - ${moment(timestamp).endOf(_timeframe?.timeframe).format('MMM D, YYYY')}` : ''}`,
          short_name: moment(timestamp).startOf(_timeframe?.timeframe).format('D MMM'),
          value: volume,
          value_string: number_format(volume, volume > 1000000 ? '0,0.00a' : volume > 10000 ? '0,0' : '0,0.00'),
        }
      }))
    }
  }, [volumes])

  const d = data?.find(d => d.id === xFocus) || _.last(data)
  const {
    time_string,
    value,
  } = { ...d }

  return (
    <div className="h-80 bg-white dark:bg-black border border-slate-100 dark:border-slate-800 shadow dark:shadow-slate-400 rounded-lg space-y-0.5 pt-5 pb-0 sm:pb-1 px-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-0.5">
          <span className="font-bold">
            {title}
          </span>
          <span className="text-slate-400 dark:text-slate-200 text-xs font-medium">
            {description} {timeframes.find(t => t?.day === timeframe)?.timeframe}
          </span>
        </div>
        {d && (
          <div className="flex flex-col items-end">
            <span className="uppercase font-bold">
              {currency_symbol}{number_format(value, '0,0.00')}
            </span>
            <span className="text-slate-400 dark:text-slate-200">
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
              className="mobile-hidden-x small-x"
            >
              <defs>
                <linearGradient
                  id="gradient-volume"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="25%"
                    stopColor="#ef4444"
                    stopOpacity={0.95}
                  />
                  <stop
                    offset="100%"
                    stopColor="#ef4444"
                    stopOpacity={0.75}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="short_name"
                axisLine={false}
                tickLine={false}
              />
              <Bar
                dataKey="value"
                minPointSize={5}
              >
                {data.map((d, i) => (
                  <Cell
                    key={i}
                    fillOpacity={1}
                    fill="url(#gradient-volume)"
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