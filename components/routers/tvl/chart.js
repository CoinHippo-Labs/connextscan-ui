import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { ResponsiveContainer, BarChart, linearGradient, stop, XAxis, YAxis, Bar, Tooltip } from 'recharts'
import { TailSpin } from 'react-loader-spinner'

import DecimalsFormat from '../../decimals-format'
import Image from '../../image'
import { currency_symbol } from '../../../lib/object/currency'
import { split, toArray, numberFormat, loaderColor } from '../../../lib/utils'

export default (
  {
    title = 'TVL',
    description = '',
    liquidity,
    utilization,
    field = 'liquidity',
    fields = ['asset', 'chain'],
    prefix = currency_symbol,
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
      const getUtilization = (asset, chain) => {
        const d = toArray(utilization).find(d => d.asset === asset)

        if (chain) {
          const {
            value,
          } = { ...toArray(d.chains).find(c => c.chain === chain) }

          return !value || value < 0 ? 0 : value
        }
        else {
          const {
            value,
          } = { ...d }

          return !value || value < 0 ? 0 : value
        }
      }

      if (liquidity && chains_data && assets_data) {
        setData(
          liquidity.filter(l => l.value > 1000).map(l => {
            const {
              value,
              chains,
            } = { ...l }

            const id = l.asset
            const {
              symbol,
              image,
              color,
            } = { ...assets_data.find(d => d.id === id) }

            return {
              id,
              name: symbol,
              short_name: symbol,
              image,
              color,
              value: field === 'utilization' ? getUtilization(id) : value,
              ...Object.fromEntries(toArray(chains).flatMap(c => [[`utilization.${c.chain}`, getUtilization(id, c.chain)], [`liquidity.${c.chain}`, c.value]])),
            }
          })
        )
      }
    },
    [liquidity, chains_data, assets_data],
  )

  const CustomTooltip = ({ active, payload, label }) => {
    if (active) {
      const data = _.head(payload)?.payload
      const values = Object.entries({ ...data }).filter(([k, v]) => k.startsWith(`${field}.`)).map(([k, v]) => { return { id: _.last(split(k, 'normal', '.')), value: v } })

      return values.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800 dark:bg-opacity-75 border border-slate-200 dark:border-slate-800 flex flex-col space-y-1 p-2">
          {values
            .filter(v => v.value)
            .map((v, i) => {
              const {
                id,
                value,
              } = { ...v }

              const {
                name,
                image,
              } = { ...toArray(chains_data).find(c => c.id === id) }

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
                      {name || id}
                    </span>
                  </div>
                  <DecimalsFormat
                    value={value}
                    prefix={prefix}
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
    else {
      return null
    }
  }

  const d = toArray(data).find(d => d.id === xFocus)
  const {
    id,
    name,
    image,
    value,
  } = { ...d }

  const gradient_id = `gradient-${fields.join('-')}`
  const chain_fields = _.orderBy(_.uniqBy(toArray(data).flatMap(d => Object.keys(d).filter(k => k.startsWith('liquidity.')).map(k => _.last(split(k, 'normal', '.'))).map(k => { return { id: k, i: toArray(chains_data).findIndex(c => c.id === k) } })), 'id'), ['i'], ['asc']).map(d => d.id)

  return (
    <div className="bg-white dark:bg-slate-900 dark:bg-opacity-75 border border-slate-100 dark:border-slate-900 rounded-lg space-y-0.5 pt-5 pb-0 sm:pb-1 px-5">
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
              prefix={prefix}
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
              layout="vertical"
              data={data}
              onMouseEnter={e => setXFocus(_.head(e?.activePayload)?.payload?.id)}
              onMouseMove={e => setXFocus(_.head(e?.activePayload)?.payload?.id)}
              onMouseLeave={() => setXFocus(null)}
              margin={{ top: 0, right: 2, bottom: 0, left: 2 }}
              className="small-x"
            >
              <defs>
                {chain_fields.map((f, i) => {
                  const {
                    color,
                  } = { ...toArray(chains_data).find(c => c.id === f) }

                  return (
                    <linearGradient key={i} id={`${gradient_id}_${f}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="25%" stopColor={color} stopOpacity={0.95} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.75} />
                    </linearGradient>
                  )
                })}
              </defs>
              <XAxis type="number" axisLine={false} tickLine={false} />
              <YAxis dataKey="short_name" type="category" axisLine={false} tickLine={false} />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }} />
              {chain_fields.map((f, i) => (
                <Bar
                  key={i}
                  stackId={field}
                  dataKey={`${field}.${f}`}
                  barSize={18}
                  fill={`url(#${gradient_id}_${f})`}
                />
              ))}
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