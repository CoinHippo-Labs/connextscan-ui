import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import Routers from './routers'
import Metrics from '../metrics'
import SelectTimeframe from '../select/timeframe'
import Volume from '../dashboard/volume'
import Transfers from '../dashboard/transfers'
import Fee from '../dashboard/fee'
import Assets from '../assets'
import Pools from '../pools'
import { getDailyTransferMetrics, getDailyTransferVolume } from '../../lib/api/metrics'
import { getChainData, getAssetData, getContractData, TIMEFRAMES } from '../../lib/object'
import { formatUnits } from '../../lib/number'
import { toArray, equalsIgnoreCase } from '../../lib/utils'

export default () => {
  const { preferences, chains, assets, router_asset_balances, pools, dev } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, router_asset_balances: state.router_asset_balances, pools: state.pools, dev: state.dev }), shallowEqual)
  const { page_visible } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { router_asset_balances_data } = { ...router_asset_balances }
  const { pools_data } = { ...pools }
  const { sdk } = { ...dev }

  const router = useRouter()
  const { query } = { ...router }
  const { chain } = { ...query }

  const [liquidity, setLiquidity] = useState(null)
  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1].day)
  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (page_visible && chains_data && assets_data && sdk && chain) {
          const response = toArray(await sdk.sdkUtils.getRoutersData())
          const { chain_id, domain_id } = { ...getChainData(chain, chains_data) }
          const data = response.filter(d => d.domain === domain_id).map(d => {
            const { local, balance } = { ...d }
            let asset_data = getAsset(undefined, assets_data, { chain_id, contract_address: local })
            asset_data = { ...asset_data, ...getContractData(chain_id, asset_data?.contracts) }
            if (asset_data.contracts) {
              delete asset_data.contracts
            }
            if (asset_data.next_asset && equalsIgnoreCase(asset_data.next_asset.contract_address, local)) {
              asset_data = { ...asset_data, ...asset_data.next_asset }
              delete asset_data.next_asset
            }
            const { decimals, price } = { ...asset_data }
            const amount = formatUnits(balance, decimals)
            return {
              ...d,
              chain_id,
              contract_address: local,
              amount,
              value: amount * (price || 0),
            }
          })
          setLiquidity(data)
        }
      }

      getData()
      const interval = setInterval(() => getData(), 1 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chains_data, assets_data, pools_data, sdk, chain],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (page_visible && chain && sdk && chains_data && assets_data) {
          if (data) {
            setData(null)
          }

          const t = TIMEFRAMES.find(d => d.day === timeframe)
          const { day } = { ...t }
          const { domain_id } = { ...getChainData(chain, chains_data) }
          const filters = { destination_chain: `eq.${domain_id}` }
          if (day) {
            filters.transfer_date = `gt.${moment().subtract(day, 'days').startOf('day').format('YYYY-MM-DD')}`
          }

          const volumes = toArray(await getDailyTransferVolume(filters)).filter(d => d.transfer_date).map(d => {
            const { transfer_date, origin_chain, destination_chain, asset, volume, usd_volume } = { ...d }
            const origin_chain_data = getChainData(origin_chain, chains_data)
            const destination_chain_data = getChainData(destination_chain, chains_data)
            const { chain_id } = { ...origin_chain_data }
            let asset_data = getAssetData(undefined, assets_data, { chain_id, contract_address: asset })
            asset_data = { ...asset_data, ...getContractData(chain_id, asset_data?.contracts) }
            if (asset_data.contracts) {
              delete asset_data.contracts
            }
            if (asset_data.next_asset && equalsIgnoreCase(asset_data.next_asset.contract_address, asset)) {
              asset_data = { ...asset_data, ...asset_data.next_asset }
              delete asset_data.next_asset
            }
            const { decimals, price } = { ...asset_data }
            const amount = formatUnits(volume, decimals)
            return {
              ...d,
              timestamp: moment(transfer_date, 'YYYY-MM-DD').startOf(t?.timeframe).valueOf(),
              origin_chain_data,
              destination_chain_data,
              asset_data,
              amount,
              volume: usd_volume || (amount * (price || 0)),
            }
          })

          const transfers = toArray(await getDailyTransferMetrics(filters)).filter(d => d.transfer_date).map(d => {
            const { transfer_date, origin_chain, destination_chain } = { ...d }
            const origin_chain_data = getChainData(origin_chain, chains_data)
            const destination_chain_data = getChainData(destination_chain, chains_data)
            return {
              ...d,
              timestamp: moment(transfer_date, 'YYYY-MM-DD').startOf(t?.timeframe).valueOf(),
              origin_chain_data,
              destination_chain_data,
            }
          })

          setData({
            total_volume: _.sumBy(volumes, 'volume'),
            volumes: _.slice(
              _.orderBy(
                Object.entries(_.groupBy(volumes, 'timestamp')).map(([k, v]) => {
                  return {
                    timestamp: Number(k),
                    volume: _.sumBy(v, 'volume'),
                  }
                }),
                ['timestamp'], ['asc'],
              ),
              -(timeframe || 52),
            ),
            total_transfers: _.sumBy(transfers, 'transfer_count'),
            transfers: _.slice(
              _.orderBy(
                Object.entries(_.groupBy(transfers, 'timestamp')).map(([k, v]) => {
                  return {
                    timestamp: Number(k),
                    transfers: _.sumBy(v, 'transfer_count'),
                  }
                }),
                ['timestamp'], ['asc'],
              ),
              -(timeframe || 52),
            ),
          })
        }
      }
      getData()
    },
    [page_visible, chains_data, assets_data, sdk, chain, timeframe],
  )

  const { chain_id } = { ...getChainData(chain, chains_data) }
  const { total_volume, volumes, total_transfers, transfers, /*fees*/ } = { ...data }
  const metrics = liquidity && pools_data && data && {
    liquidity: _.sumBy(liquidity, 'value') + (pools_data ? _.sumBy(pools_data.filter(d => d.chain_id === chain_id), 'tvl') : 0),
    volume: total_volume,
    transfers: total_transfers,
    // fee: 33.33,
  }
  const routers = router_asset_balances_data && _.orderBy(
    Object.entries(_.groupBy(toArray(router_asset_balances_data[chain_id]), 'router_address')).map(([k, v]) => {
      return {
        router_address: k,
        assets: _.orderBy(v, ['value'], ['desc']),
        total_value: _.sumBy(v, 'value'),
      }
    }),
    ['total_value'], ['desc'],
  ).map((d, i) => { return { ...d, i } })

  return (
    <div className="space-y-6">
      <Metrics data={metrics} numDays={timeframe} />
      <div className="grid lg:grid-cols-4 gap-4 mx-auto">
        <div className="lg:col-span-4 flex items-center justify-end">
          <SelectTimeframe value={timeframe} onSelect={t => setTimeframe(t)} />
        </div>
        <div className="lg:col-span-4">
          <Volume timeframe={timeframe} volumes={volumes} />
        </div>
        <div className="lg:col-span-4">
          <Transfers timeframe={timeframe} transfers={transfers} />
        </div>
        {/*<div className="lg:col-span-4">
          <Fee timeframe={timeframe} fees={fees} />
        </div>*/}
      </div>
      <div className="w-full grid lg:grid-cols-2 gap-4">
        <Assets data={liquidity} />
        <Pools data={pools_data} />
      </div>
      <div className="w-full">
        <Routers data={routers} />
      </div>
    </>
  )
}