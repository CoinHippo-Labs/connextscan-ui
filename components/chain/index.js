import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { utils } from 'ethers'

import Routers from './routers'
import Metrics from '../metrics'
import SelectTimeframe from '../select-options/timeframe'
import Volume from '../dashboard/volume'
import Transfers from '../dashboard/transfers'
import Fee from '../dashboard/fee'
import Assets from '../assets'
import Pools from '../pools'
import { daily_transfer_metrics, daily_transfer_volume } from '../../lib/api/metrics'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { timeframes } from '../../lib/object/timeframe'
import { toArray, equalsIgnoreCase } from '../../lib/utils'

export default () => {
  const {
    preferences,
    chains,
    assets,
    router_asset_balances,
    pools,
    dev,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        router_asset_balances: state.router_asset_balances,
        pools: state.pools,
        dev: state.dev,
      }
    ),
    shallowEqual,
  )
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
  const [timeframe, setTimeframe] = useState(timeframes[1].day)
  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (page_visible && chain && sdk && chains_data && assets_data) {
          const response = toArray(await sdk.sdkUtils.getRoutersData())
          const { chain_id, domain_id } = { ...getChain(chain, chains_data) }

          const data =
            response
              .filter(d => d?.domain === domain_id)
              .map(d => {
                const { local, balance } = { ...d }

                let asset_data = getAsset(null, assets_data, chain_id, local)
                asset_data = {
                  ...asset_data,
                  ...getContract(chain_id, asset_data?.contracts),
                }
                if (asset_data.contracts) {
                  delete asset_data.contracts
                }
                if (asset_data.next_asset && equalsIgnoreCase(asset_data.next_asset.contract_address, local)) {
                  asset_data = {
                    ...asset_data,
                    ...asset_data.next_asset,
                  }
                  delete asset_data.next_asset
                }

                const { decimals, price } = { ...asset_data }
                const amount = Number(utils.formatUnits(BigInt(balance || '0'), decimals || 18))
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
      const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chain, sdk, chains_data, assets_data, pools_data],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (page_visible && chain && sdk && chains_data && assets_data) {
          if (data) {
            setData(null)
          }

          const _timeframe = timeframes.find(t => t?.day === timeframe)
          const { domain_id } = { ...getChain(chain, chains_data) }
          const filters = { destination_chain: `eq.${domain_id}` }
          if (_timeframe?.day) {
            filters.transfer_date = `gt.${moment().subtract(_timeframe.day, 'days').startOf('day').format('YYYY-MM-DD')}`
          }

          const volumes =
            toArray(await daily_transfer_volume(filters))
              .filter(v => v.transfer_date)
              .map(v => {
                const { transfer_date, origin_chain, destination_chain, asset, volume, usd_volume } = { ...v }
                const origin_chain_data = getChain(origin_chain, chains_data)
                const destination_chain_data = getChain(destination_chain, chains_data)

                let asset_data = getAsset(null, assets_data, origin_chain_data?.chain_id, asset)
                asset_data = {
                  ...asset_data,
                  ...getContract(origin_chain_data?.chain_id, asset_data?.contracts),
                }
                if (asset_data.contracts) {
                  delete asset_data.contracts
                }
                if (asset_data.next_asset && equalsIgnoreCase(asset_data.next_asset.contract_address, asset)) {
                  asset_data = {
                    ...asset_data,
                    ...asset_data.next_asset,
                  }
                  delete asset_data.next_asset
                }

                const { decimals, price } = { ...asset_data }
                const amount = Number(utils.formatUnits(BigInt(volume || '0'), decimals || 18))
                return {
                  ...v,
                  timestamp: moment(transfer_date, 'YYYY-MM-DD').startOf(_timeframe?.timeframe).valueOf(),
                  origin_chain_data,
                  destination_chain_data,
                  asset_data,
                  amount,
                  volume: usd_volume || (amount * (price || 0)),
                }
              })

          const transfers =
            toArray(await daily_transfer_metrics(filters))
              .filter(t => t.transfer_date)
              .map(t => {
                const { transfer_date, origin_chain, destination_chain } = { ...t }
                const origin_chain_data = getChain(origin_chain, chains_data)
                const destination_chain_data = getChain(destination_chain, chains_data)

                return {
                  ...t,
                  timestamp: moment(transfer_date, 'YYYY-MM-DD').startOf(_timeframe?.timeframe).valueOf(),
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
    [page_visible, chain, sdk, timeframe, chains_data, assets_data],
  )

  const {
    total_volume,
    volumes,
    total_transfers,
    transfers,
    // fees,
  } = { ...data }

  const metrics = liquidity && pools_data && data && {
    liquidity: _.sumBy(liquidity, 'value') + (pools_data ? _.sumBy(pools_data.filter(p => p.chain_id === getChain(chain, chains_data)?.chain_id), 'tvl') : 0),
    volume: total_volume,
    transfers: total_transfers,
    // fee: 33.33,
  }

  const { chain_id } = { ...getChain(chain, chains_data) }
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
    <>
      <div className="mb-6">
        <Metrics data={metrics} num_stats_days={timeframe} />
      </div>
      <div className="grid lg:grid-cols-4 gap-4 mt-2 mb-6 mx-auto">
        <div className="lg:col-span-4 flex items-center justify-end">
          <SelectTimeframe value={timeframe} onSelect={t => setTimeframe(t)} />
        </div>
        <div className="lg:col-span-4">
          <Volume timeframe={timeframe} volumes={volumes} />
        </div>
        <div className="lg:col-span-4">
          <Transfers timeframe={timeframe} transfers={transfers} />
        </div>
        {/*
          <div className="lg:col-span-4">
            <Fee timeframe={timeframe} fees={fees} />
          </div>
        */}
      </div>
      <div className="w-full grid grid-flow-row lg:grid-cols-2 gap-4 mb-6">
        <Assets data={liquidity} />
        <Pools data={pools_data} />
      </div>
      <div className="w-full mb-4">
        <Routers data={routers} />
      </div>
    </>
  )
}