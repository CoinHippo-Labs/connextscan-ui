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
  Tooltip,
} from 'recharts'
import { TailSpin } from 'react-loader-spinner'

import Image from '../../image'
import { timeframes } from '../../../lib/object/timeframe'
import { chainName } from '../../../lib/object/chain'
import { currency_symbol } from '../../../lib/object/currency'
import { number_format, loader_color } from '../../../lib/utils'

const CustomTooltip = ({
  active,
  payload,
  label,
}) => {
  if (active) {
    const {
      values,
    } = { ...payload?.[0]?.payload }

    return values?.length > 0 &&
      (
        <div className="bg-slate-100 dark:bg-slate-800 dark:bg-opacity-75 border border-slate-200 dark:border-slate-800 rounded-lg flex flex-col space-y-1 p-2">
          {values
            .map((v, i) => {
              const {
                chain_data,
                fee,
              } = { ...v }
              const {
                image,
              } = { ...chain_data }

              return (
                <div
                  key={i}
                  className="flex items-center justify-between space-x-4"
                >
                  <div className="flex items-center space-x-1.5">
                    {
                      image &&
                      (
                        <Image
                          src={image}
                          alt=""
                          width={18}
                          height={18}
                          className="rounded-full"
                        />
                      )
                    }
                    <span className="text-xs font-semibold">
                      {chainName(chain_data)}
                    </span>
                  </div>
                  <span className=" text-xs font-semibold">
                    {currency_symbol}
                    {number_format(
                      fee,
                      fee > 10000 ?
                        '0,0' :
                        '0,0.000000',
                    )}
                  </span>
                </div>
              )
            })
          }
        </div>
      )
  }

  return null
}

export default ({
  title = 'Fee',
  description = 'Transfer fee by',
  timeframe = null,
  stacked = false,
  fees,
}) => {
  const {
    preferences,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }

  const router = useRouter()

  const [data, setData] = useState(null)
  const [xFocus, setXFocus] = useState(null)

  useEffect(() => {
    if (fees) {
      const _timeframe = timeframes
        .find(t =>
          t?.day === timeframe
        )

      setData(
        fees
          .map(d => {
            const {
              timestamp,
              fee,
              fee_by_chains,
            } = { ...d }

            return {
              ...d,
              id: timestamp,
              time_string:
                `${
                  moment(timestamp)
                    .startOf(_timeframe?.timeframe)
                    .format('MMM D, YYYY')
                }${
                  _timeframe?.timeframe === 'week' ?
                    ` - ${
                      moment(timestamp)
                        .endOf(_timeframe?.timeframe)
                        .format('MMM D, YYYY')
                    }` :
                    ''
                }`,
              short_name:
                moment(timestamp)
                  .startOf(_timeframe?.timeframe)
                  .format('D MMM'),
              value: fee,
              value_string:
                number_format(
                  fee,
                  fee > 10000 ?
                    '0,0.00a' :
                    fee > 1000 ?
                      '0,0' :
                      '0,0.00',
                ),
              values: fee_by_chains,
              ...Object.fromEntries(
                (Array.isArray(fee_by_chains) ?
                  fee_by_chains :
                  []
                )
                .map(v => {
                  const {
                    id,
                    fee,
                  } = { ...v }

                  return [
                    id,
                    fee,
                  ]
                })
              ),
            }
          })
      )
    }
  }, [fees])

  const d =
    (data || [])
      .find(d =>
        d.id === xFocus
      ) ||
    _.last(data)

  const {
    time_string,
    value,
    values,
  } = { ...d }

  return (
    <div className="h-80 bg-white dark:bg-slate-900 dark:bg-opacity-75 border border-slate-100 dark:border-slate-900 rounded-lg space-y-0.5 pt-5 pb-0 sm:pb-1 px-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-0.5">
          <span className="font-bold">
            {title}
          </span>
          <span className="text-slate-400 dark:text-slate-200 text-xs font-medium">
            <span>
              {description}
            </span>
            <span>
              {
                timeframes
                  .find(t =>
                    t?.day === timeframe
                  )?.timeframe
              }
            </span>
          </span>
        </div>
        {
          d &&
          (
            <div className="flex flex-col items-end">
              <span className="uppercase font-bold">
                {currency_symbol}
                {number_format(
                  value,
                  '0,0',
                )}
              </span>
              <span className="text-slate-400 dark:text-slate-200">
                {time_string}
              </span>
            </div>
          )
        }
      </div>
      <div className="w-full h-64">
        {data ?
          <ResponsiveContainer>
            <BarChart
              data={data}
              onMouseEnter={e => {
                if (e) {
                  const {
                    id,
                  } = { ..._.head(e.activePayload)?.payload }

                  setXFocus(id)
                }
              }}
              onMouseMove={e => {
                if (e) {
                  const {
                    id,
                  } = { ..._.head(e.activePayload)?.payload }

                  setXFocus(id)
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
                  id="gradient-fee"
                  x1="0"
                  y1="0"
                  x2="0"
                  y2="1"
                >
                  <stop
                    offset="25%"
                    stopColor="#eab308"
                    stopOpacity={0.95}
                  />
                  <stop
                    offset="100%"
                    stopColor="#eab308"
                    stopOpacity={0.75}
                  />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="short_name"
                axisLine={false}
                tickLine={false}
              />
              {
                stacked &&
                values?.length > 0 ?
                  <>
                    <Tooltip
                      content={(
                        <CustomTooltip />
                      )}
                      cursor={{
                        fill: 'transparent',
                      }}
                    />
                    {
                      _.orderBy(
                        values,
                        ['id'],
                        ['asc'],
                      )
                      .map((v, i) => {
                        const {
                          id,
                          color,
                        } = { ...v }

                        return (
                          <Bar
                            key={i}
                            dataKey={id}
                            minPointSize={5}
                            stackId={title}
                            fill={color}
                          />
                        )
                      })
                    }
                  </> :
                  <Bar
                    dataKey="value"
                    minPointSize={5}
                  >
                    {data
                      .map((d, i) => {
                        return (
                          <Cell
                            key={i}
                            fillOpacity={1}
                            fill="url(#gradient-fee)"
                          />
                        )
                      })
                    }
                  </Bar>
              }
            </BarChart>
          </ResponsiveContainer> :
          <div className="w-full h-4/5 flex items-center justify-center">
            <TailSpin
              color={loader_color(theme)}
              width="32"
              height="32"
            />
          </div>
        }
      </div>
    </div>
  )
}