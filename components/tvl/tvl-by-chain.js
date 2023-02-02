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
import { Oval } from 'react-loader-spinner'

import Image from '../image'
import { chainTitle } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { numberFormat } from '../../lib/utils'

const CustomTooltip = ({ active, payload, label }) => {
  if (active) {
    const data = { ...payload?.[0]?.payload }

    return (
      <div className="bg-gray-50 dark:bg-black shadow-lg rounded-lg p-2">
        <div className="flex flex-col space-y-1.5">
          <div className="flex items-center space-x-1.5">
            <Image
              src={data?.chain?.image}
              alt=""
              className="w-5 h-5 rounded-full"
            />
            <span className="text-xs font-semibold">{chainTitle(data?.chain)}</span>
          </div>
          <div className="flex flex-col items-start space-y-1">
            <div className="flex items-center space-x-1">
              <span className="font-mono text-xs font-semibold">
                {currency_symbol}{numberFormat(data?.amount_value, data?.amount_value > 10000 ? '0,0' : '0,0.00000000')}
              </span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return null
}

export default function TVLByChain({ selectChainId }) {
  const { preferences, chains, routers_assets } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, routers_assets: state.routers_assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { routers_assets_data } = { ...routers_assets }

  const router = useRouter()

  const [data, setData] = useState(null)

  useEffect(() => {
    if (chains_data && routers_assets_data) {
      let _data = []

      for (let i = 0; i < chains_data.length; i++) {
        const chain = chains_data[i]

        if (!chain?.disabled) {
          const assets = routers_assets_data.flatMap(ra => ra?.asset_balances?.filter(ab => ab?.chain?.chain_id === chain?.chain_id) || [])
          _data.push({ chain, assets, amount_value: _.sumBy(assets, 'amount_value') })
        }
      }

      _data = _data.map(d => {
        return {
          ...d,
          amount_value_string: `${currency_symbol}${numberFormat(d?.amount_value, d?.amount_value >= 100000 ? '0,0.00a' : '0,0')}`.toUpperCase(),
        }
      })

      setData(_data)
    }
  }, [chains_data, routers_assets_data])

  const loaded = !!data

  return (
    <div className="w-full h-56">
      {loaded ?
        <ResponsiveContainer>
          <BarChart
            data={data}
            onMouseEnter={event => {
              if (event) {
                if (selectChainId) {
                  selectChainId(event?.activePayload?.[0]?.payload?.chain?.chain_id)
                }
              }
            }}
            onMouseMove={event => {
              if (event) {
                if (selectChainId) {
                  selectChainId(event?.activePayload?.[0]?.payload?.chain?.chain_id)
                }
              }
            }}
            onMouseLeave={() => {
              if (event) {
                if (selectChainId) {
                  selectChainId(null)
                }
              }
            }}
            margin={{ top: 20, right: 0, left: 0, bottom: -8 }}
            className="small-x"
          >
            <defs>
              {data.map((entry, i) => (
                <linearGradient key={i} id={`gradient-tvl-${entry?.chain?.id}`} x1="0" y1="0" x2="0" y2="1">
                  <stop offset="25%" stopColor={entry?.chain?.color} stopOpacity={0.95} />
                  <stop offset="100%" stopColor={entry?.chain?.color} stopOpacity={0.75} />
                </linearGradient>
              ))}
            </defs>
            <XAxis dataKey="chain.short_name" axisLine={false} tickLine={false} />
            <Tooltip content={<CustomTooltip />} cursor={{ fill: 'transparent' }}/> 
            <Bar dataKey="amount_value" minPointSize={10} onClick={d => router.push(`/${d.chain?.id}`)}>
              <LabelList dataKey="amount_value_string" position="top" cursor="default" />
              {data.map((entry, i) => (<Cell key={i} cursor="pointer" fillOpacity={1} fill={`url(#gradient-tvl-${entry?.chain?.id})`} />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        :
        <div className="w-full h-48 flex items-center justify-center">
          <Oval color={theme === 'dark' ? 'white' : '#3B82F6'} width="24" height="24" />
        </div>
      }
    </div>
  )
}