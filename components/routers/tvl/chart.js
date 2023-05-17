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

import DecimalsFormat from '../../decimals-format'
import Image from '../../image'
import { currency_symbol } from '../../../lib/object/currency'
import { toArray, numberFormat, loaderColor } from '../../../lib/utils'

const CustomTooltip = (
  {
    active,
    payload,
    label,
  },
) => {
  if (active) {
    const {
      values,
    } = { ..._.head(payload)?.payload }

    return values?.length > 0 && (
      <div className="bg-slate-100 dark:bg-slate-800 dark:bg-opacity-75 border border-slate-200 dark:border-slate-800 flex flex-col space-y-1 p-2">
        {values
          .filter(v => v?.value)
          .map((v, i) => {
            const {
              id,
              value,
            } = { ...v }

            return (
              <div key={i} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-1.5">
                  <span className="text-xs font-semibold">
                    {id}
                  </span>
                </div>
                <DecimalsFormat
                  value={value}
                  prefix={currency_symbol}
                  noToolip={true}
                  className="text-xs font-semibold"
                />
              </div>
            )
          })
        }
      </div>
    )
  }

  return null
}

export default (
  {
    title = 'TVL',
    description = '',
    liquidity,
    field = 'asset',
  },
) => {
  const {
    preferences,
    chains,
    assets,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
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

  const [data, setData] = useState(null)
  const [xFocus, setXFocus] = useState(null)

  useEffect(
    () => {
      if (liquidity && chains_data && assets_data) {
        setData(
          liquidity.map(l => {
            const {
              value,
            } = { ...l }

            const id = l[field]
            const {
              name,
              short_name,
              symbol,
              image,
              color,
            } = { ...(field === 'chain' ? chains_data : assets_data).find(d => d.id === id) }

            return {
              id,
              name: symbol || name,
              short_name: symbol || short_name,
              image,
              color,
              value,
              value_string: numberFormat(value, '0,0.00a'),
            }
          })
        )
      }
    },
    [liquidity, chains_data, assets_data],
  )

  const d = toArray(data).find(d => d.id === xFocus)
  const {
    id,
    name,
    image,
    value,
  } = { ...d }

  return (
    <div className="h-80 bg-white dark:bg-slate-900 dark:bg-opacity-75 border border-slate-100 dark:border-slate-900 rounded-lg space-y-0.5 pt-5 pb-0 sm:pb-1 px-5">
      <div className="flex items-center justify-between">
        <div className="flex flex-col space-y-0.5">
          <span className="font-bold">
            {title}
          </span>
          {description && (
            <span className="text-slate-400 dark:text-slate-200 text-xs font-medium">
              {description}
            </span>
          )}
        </div>
        {d && (
          <div className="flex flex-col items-end">
            <DecimalsFormat
              value={numberFormat(value, '0,0')}
              prefix={currency_symbol}
              noToolip={true}
              className="uppercase font-bold"
            />
            <div className="flex items-center space-x-1.5">
              {image && (
                <Image
                  src={image}
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
              onMouseEnter={e => setXFocus(_.head(e?.activePayload)?.payload?.id)}
              onMouseMove={e => setXFocus(_.head(e?.activePayload)?.payload?.id)}
              onMouseLeave={() => setXFocus(null)}
              margin={{ top: 20, right: 2, bottom: 4, left: 2 }}
              className="small-x"
            >
              <defs>
                {data.map((d, i) => {
                  const {
                    id,
                    color,
                  } = { ...d }

                  return (
                    <linearGradient
                      key={i}
                      id={`gradient-${field}-${id}`}
                      x1="0"
                      y1="0"
                      x2="0"
                      y2="1"
                    >
                      <stop
                        offset="25%"
                        stopColor={color}
                        stopOpacity={0.95}
                      />
                      <stop
                        offset="100%"
                        stopColor={color}
                        stopOpacity={0.75}
                      />
                    </linearGradient>
                  )
                })}
              </defs>
              <XAxis
                dataKey="short_name"
                axisLine={false}
                tickLine={false}
              />
              <Tooltip
                content={<CustomTooltip />}
                cursor={{ fill: 'transparent' }}
              />
              <Bar
                dataKey="value"
                minPointSize={10}
              >
                <LabelList
                  dataKey="value_string"
                  position="top"
                  cursor="default"
                  className="uppercase font-semibold"
                />
                {data.map((d, i) => {
                  return (
                    <Cell
                      key={i}
                      cursor="pointer"
                      fillOpacity={1}
                      fill={`url(#gradient-${field}-${d.id})`}
                    />
                  )
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer> :
          <div className="w-full h-4/5 flex items-center justify-center">
            <TailSpin
              width="32"
              height="32"
              color={loaderColor(theme)}
            />
          </div>
        }
      </div>
    </div>
  )
}