import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Oval } from 'react-loader-spinner'

import Image from '../../image'
import { chainTitle } from '../../../lib/object/chain'
import { currency_symbol } from '../../../lib/object/currency'
import { numberFormat } from '../../../lib/utils'

export default function Volume({ data, timeSelect }) {
  const { preferences, chains, tokens } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, tokens: state.tokens }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { tokens_data } = { ...tokens }

  const router = useRouter()
  const { query } = { ...router }
  const { blockchain_id } = { ...query }

  const [volumeData, setVolumeData] = useState(null)

  useEffect(() => {
    if (chains_data && tokens_data && data) {
      const _data = data.filter(d => !timeSelect || d?.time === timeSelect)

      setVolumeData({
        data: _data,
        volume_value_by_chain: Object.entries(_.groupBy(
          _data.flatMap(d => Object.entries(d?.volume_value_by_chain || {}).map(([key, value]) => {
            return {
              key,
              value,
            }
          })
        ), 'key')).map(([key, value]) => {
          return {
            chain_id: Number(key),
            chain: chains_data.find(c => c?.chain_id === Number(key)),
            volume_value: _.sumBy(value, 'value'),
          }
        }),
        volume_value_by_token: Object.entries(_.groupBy(
          _data.flatMap(d => Object.entries(d?.volume_value_by_token || {}).map(([key, value]) => {
            return {
              key,
              value,
            }
          })
        ), 'key')).map(([key, value]) => {
          return {
            token_id: key,
            token: tokens_data.find(t => t?.id === key),
            volume_value: _.sumBy(value, 'value'),
          }
        }),
      })
    }
  }, [chains_data, tokens_data, data, timeSelect])

  const loaded = !!volumeData

  return (
    <div className="w-full h-60">
      {loaded ?
        <>
          <div className="h-3/5 sm:h-2/3 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <span className="font-mono text-2xl sm:text-xl xl:text-4xl font-bold">
                {currency_symbol}{numberFormat(_.sumBy(volumeData.data, 'volume_value'), _.sumBy(volumeData.data, 'volume_value') > 1000 ? '0,0' : '0,0.00')}
              </span>
              <span className="flex flex-wrap items-center justify-center text-sm">
                <span className="text-gray-400 dark:text-gray-600">Total Volume</span>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between space-x-2 sm:mt-0.5">
            <div className="w-full space-y-1">
              <div className="flex items-center justify-between space-x-2">
                <span className="whitespace-nowrap uppercase text-black dark:text-white text-xs font-bold">Top 3 {blockchain_id ? 'Tokens' : 'Destination'}</span>
                <span className="uppercase text-black dark:text-white text-xs font-bold">Volume</span>
              </div>
              <div className="flex flex-col items-start space-y-1">
                {blockchain_id ?
                  _.slice(_.orderBy(volumeData.volume_value_by_token, ['volume_value'], ['desc']), 0, 3).map((d, i) => (
                    <div key={i} className="w-full h-6 flex items-center justify-between space-x-2">
                      <div className="flex items-center">
                        <Image
                          src={d?.token?.image}
                          alt=""
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="text-xs font-normal ml-2">{d?.token?.symbol}</span>
                      </div>
                      <span className="font-mono text-xs font-normal">
                        {currency_symbol}{numberFormat(d?.volume_value, d?.volume_value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                    </div>
                  ))
                  :
                  _.slice(_.orderBy(volumeData.volume_value_by_chain, ['volume_value'], ['desc']), 0, 3).map((d, i) => (
                    <div key={i} className="w-full h-6 flex items-center justify-between space-x-2">
                      <Link href={`/${d?.chain?.id}`}>
                        <a className="flex items-center">
                          <Image
                            src={d?.chain?.image}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-xs font-normal ml-2">{chainTitle(d?.chain)}</span>
                        </a>
                      </Link>
                      <span className="font-mono text-xs font-normal">
                        {currency_symbol}{numberFormat(d?.volume_value, d?.volume_value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                    </div>
                  ))
                }
              </div>
            </div>
          </div>
        </>
        :
        <div className="w-full h-56 flex items-center justify-center">
          <Oval color={theme === 'dark' ? 'white' : '#3B82F6'} width="24" height="24" />
        </div>
      }
    </div>
  )
}