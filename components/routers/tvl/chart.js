import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { ResponsiveContainer, BarChart, linearGradient, stop, XAxis, YAxis, Bar, Tooltip } from 'recharts'
import _ from 'lodash'

import Spinner from '../../spinner'
import NumberDisplay from '../../number'
import Image from '../../image'
import { getChainData, getAssetData } from '../../../lib/object'
import { split, toArray } from '../../../lib/utils'

const MIN_LIQUIDITY = 1000

export default (
  {
    field = 'liquidity',
    fields = ['asset', 'chain'],
    title = 'TVL',
    description = '',
    liquidity,
    utilization,
    prefix = '',
  },
) => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const [data, setData] = useState(null)
  const [x, setX] = useState(null)

  useEffect(
    () => {
      const getUtilization = (asset, chain) => {
        const d = toArray(utilization).find(d => d.asset === asset)
        if (chain) {
          const { value } = { ...toArray(d.chains).find(c => c.chain === chain) }
          return value > 0 ? value : 0
        }
        else {
          const { value } = { ...d }
          return value > 0 ? value : 0
        }
      }

      if (liquidity && chains_data && assets_data) {
        setData(
          liquidity.filter(d => d.value > MIN_LIQUIDITY).map(d => {
            const { value, asset, chains } = { ...d }
            const id = asset
            const { symbol, image, color } = { ...getAssetData(id, assets_data) }
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

  const CustomTooltip = ({ active, payload }) => {
    if (active) {
      const data = _.head(payload)?.payload
      const values = Object.entries({ ...data }).filter(([k, v]) => k.startsWith(`${field}.`)).map(([k, v]) => { return { id: _.last(split(k, 'normal', '.')), value: v } })
      return values.length > 0 && (
        <div className="bg-slate-100 dark:bg-slate-800 dark:bg-opacity-75 border border-slate-200 dark:border-slate-800 flex flex-col space-y-2 p-2">
          {values.filter(d => d.value).map((d, i) => {
            const { id, value } = { ...d }
            const { name, image } = { ...getChainData(id, chains_data) }
            return (
              <div key={i} className="flex items-center justify-between space-x-4">
                <div className="flex items-center space-x-2">
                  {image && (
                    <Image
                      src={image}
                      width={18}
                      height={18}
                      className="3xl:w-6 3xl:h-6 rounded-full"
                    />
                  )}
                  <span className="text-base 3xl:text-2xl font-semibold">
                    {name || id}
                  </span>
                </div>
                <NumberDisplay
                  value={value}
                  prefix={prefix}
                  noToolip={true}
                  className="text-base 3xl:text-2xl font-semibold"
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
  const chain_fields = _.orderBy(
    _.uniqBy(toArray(data).flatMap(d => Object.keys(d).filter(k => k.startsWith('liquidity.')).map(k => _.last(split(k, 'normal', '.'))).map(k => { return { id: k, i: toArray(chains_data).findIndex(c => c.id === k) } })), 'id'),
    ['i'], ['asc'],
  ).map(d => d.id)
  const gradient_id = `gradient-${fields.join('-')}`

  return (
    <div className="bg-white dark:bg-slate-900 dark:bg-opacity-75 rounded space-y-2 pt-5 pb-0 sm:pb-1 px-5">
      <div className="flex items-start justify-between space-x-1">
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
              layout="vertical"
              data={data}
              onMouseEnter={e => setX(_.head(e?.activePayload)?.payload?.timestamp)}
              onMouseMove={e => setX(_.head(e?.activePayload)?.payload?.timestamp)}
              onMouseLeave={() => setX(null)}
              margin={{ top: 0, right: 2, bottom: 0, left: 2 }}
              className="small-x"
            >
              <defs>
                {chain_fields.map((f, i) => {
                  const { color } = { ...getChainData(f, chains_data) }
                  return (
                    <linearGradient key={i} id={`${gradient_id}_${f}`} x1="0" y1="0" x2="0" y2="1">
                      <stop offset="50%" stopColor={color} stopOpacity={0.66} />
                      <stop offset="100%" stopColor={color} stopOpacity={0.33} />
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
            <Spinner width={36} height={36} />
          </div>
        }
      </div>
    </div>
  )
}