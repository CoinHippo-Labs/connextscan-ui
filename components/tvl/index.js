import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { Oval } from 'react-loader-spinner'

import Image from '../image'
import { chainTitle } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { numberFormat } from '../../lib/utils'

export default function TVL({ chainId }) {
  const { preferences, chains, assets, routers_assets } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, routers_assets: state.routers_assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { routers_assets_data } = { ...routers_assets }

  const [data, setData] = useState(null)

  useEffect(() => {
    if (chains_data && assets_data && routers_assets_data) {
      let _data = []

      for (let i = 0; i < chains_data.length; i++) {
        const chain = chains_data[i]

        if (chain && !chain.disabled && (!chainId || chain.chain_id === chainId)) {
          const assets = routers_assets_data.flatMap(ra => ra?.asset_balances?.filter(ab => ab?.chain?.chain_id === chain?.chain_id) || [])
          const routers = _.orderBy(routers_assets_data.map(ra => {
            return {
              ...ra,
              asset_balances: ra?.asset_balances?.filter(ab => ab?.chain?.chain_id === chain?.chain_id).map(ab => {
                const asset = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === ab?.asset?.chain_id && c?.contract_address === ab.asset.contract_address) > -1)

                return {
                  ...ab,
                  symbol: asset?.symbol || ab?.asset?.symbol?.substring(0, ab.asset.symbol.includes('.') ? ab.asset.symbol.indexOf('.') : ab.asset.symbol.length).split('').filter(c => c === c.toUpperCase()).join(''),
                  general_asset: asset,
                }
              }) || [],
            }
          }).map(r => {
            return {
              ...r,
              amount_value: _.sumBy(r.asset_balances, 'amount_value'),
            }
          }), ['amount_value', 'amount'], ['desc', 'desc'])
          _data.push({ chain, assets, amount_value: _.sumBy(assets, 'amount_value'), routers })
        }
      }

      setData(_data)
    }
  }, [chains_data, assets_data, routers_assets_data, chainId])

  const loaded = !!data

  return (
    <div className="w-full h-56">
      {loaded ?
        <>
          <div className="h-4/5 flex items-center justify-center">
            <div className="flex flex-col items-center space-y-2">
              <span className="break-all font-mono text-2xl sm:text-xl xl:text-4xl font-bold text-right">
                {currency_symbol}{numberFormat(_.sumBy(data, 'amount_value'), '0,0')}
              </span>
              <span className="flex flex-wrap items-center justify-center text-sm">
                <span className="text-gray-400 dark:text-gray-600">Total Value Locked on</span>
                <div className="flex items-center space-x-2 ml-2.5">
                  <Image
                    src="/logos/logo.png"
                    alt=""
                    className="w-6 h-6"
                  />
                  <span className="font-bold">Connext</span>
                </div>
              </span>
            </div>
          </div>
          <div className="flex items-center justify-between space-x-2">
            <div className="space-y-1">
              <span className="whitespace-nowrap uppercase text-black dark:text-white text-xs font-bold">{chainId ? 'Chain' : 'Top 3 Chains'}</span>
              <div className="flex items-center space-x-1">
                {_.slice(_.orderBy(data, ['amount_value', 'amount'], ['desc', 'desc']), 0, 3).map((d, i) => (
                  <Link key={i} href={`/${d?.chain?.id}`}>
                    <a className="h-6 flex items-center">
                      <Image
                        src={d?.chain?.image}
                        alt=""
                        className="w-5 h-5 rounded-full"
                      />
                      {chainId && (
                        <span className="text-xs font-normal ml-2">{chainTitle(d?.chain)}</span>
                      )}
                    </a>
                  </Link>
                ))}
              </div>
            </div>
            <div className="text-right space-y-1">
              <span className="whitespace-nowrap uppercase text-black dark:text-white text-xs font-bold">Top 3 Tokens</span>
              <div className="flex items-center justify-end space-x-1.5 -mr-0.5">
                {_.slice(_.orderBy(Object.entries(_.groupBy(data.flatMap(d => d?.routers?.flatMap(r => r?.asset_balances || []) || []), 'symbol')).map(([key, value]) => {
                  return {
                    ..._.maxBy(value, ['amount_value']),
                    amount: _.sumBy(value, 'amount'),
                    amount_value: _.sumBy(value, 'amount_value'),
                  }
                }), ['amount_value', 'amount'], ['desc', 'desc']), 0, 3).map((d, i) => (
                  <div key={i} className="h-6 bg-gray-100 dark:bg-gray-800 rounded-xl flex items-center space-x-1 py-1 px-1.5">
                    <Image
                      src={[d?.general_asset?.image, d?.asset?.image]}
                      alt=""
                      className="w-3.5 h-3.5 rounded-full"
                    />
                    <span className="text-gray-700 dark:text-gray-300 text-2xs">{d?.general_asset?.symbol || d?.asset?.symbol}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
        :
        <div className="w-full h-48 flex items-center justify-center">
          <Oval color={theme === 'dark' ? 'white' : '#3B82F6'} width="24" height="24" />
        </div>
      }
    </div>
  )
}