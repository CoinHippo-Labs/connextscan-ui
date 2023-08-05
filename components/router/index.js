import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import Metrics from '../metrics'
import RouterLiquidity from '../router-liquidity'
import Assets from '../assets'
import Transfers from '../transfers'
import { getDailyTransferMetrics, getDailyTransferVolume } from '../../lib/api/metrics'
import { NUM_STATS_DAYS } from '../../lib/config'
import { getKeyType } from '../../lib/key'
import { getChainData, getAssetData, getContractData } from '../../lib/object'
import { formatUnits } from '../../lib/number'
import { toArray, equalsIgnoreCase } from '../../lib/utils'

export default () => {
  const { preferences, chains, assets, ens, dev } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, ens: state.ens, dev: state.dev }), shallowEqual)
  const { page_visible } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }
  const { sdk } = { ...dev }

  const router = useRouter()
  const { query } = { ...router }
  const { address, action } = { ...query }

  const [liquidity, setLiquidity] = useState(null)
  const [data, setData] = useState(null)

  useEffect(
    () => {
      if (getKeyType(address) === 'ens' && Object.values({ ...ens_data }).findIndex(d => equalsIgnoreCase(d.name, address)) > -1) {
        router.push(`/router/${_.head(Object.entries(ens_data).find(([k, v]) => equalsIgnoreCase(v.name, address)))}`)
      }
    },
    [ens_data, address],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (page_visible && chains_data && assets_data && sdk) {
          const response = toArray(await sdk.sdkUtils.getRoutersData())
          const data = response.filter(d => equalsIgnoreCase(d.address, address) && getChainData(d.domain, chains_data)).map(d => {
            const { domain, local, balance } = { ...d }
            const chain_data = getChainData(domain, chains_data)
            const { chain_id } = { ...chain_data }

            let asset_data = getAssetData(undefined, assets_data, { chain_id, contract_address: local })
            asset_data = { ...asset_data, ...getContractData(chain_id, asset_data?.contracts) }
            if (asset_data.contracts) {
              delete asset_data.contracts
            }
            if (asset_data.next_asset && equalsIgnoreCase(asset_data.next_asset.contract_address, local)) {
              asset_data = { ...asset_data, ...asset_data.next_asset }
              delete asset_data.next_asset
            }
            const { decimals, price } = { ...asset_data }
            const amount = formatUnits(balance || '0', decimals)
            return {
              ...d,
              chain_id,
              contract_address: local,
              amount,
              value: amount * (price || 0),
            }
          })
          setLiquidity(data)
          if (action === 'refresh') {
            router.push(`/router/${address}`)
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chains_data, assets_data, sdk, address, action],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (chains_data && assets_data && sdk) {
          const transfer_date = `gt.${moment().subtract(NUM_STATS_DAYS, 'days').startOf('day').format('YYYY-MM-DD')}`

          const volumes = toArray(await getDailyTransferVolume({ router: `eq.${address?.toLowerCase()}`, transfer_date })).filter(d => d.transfer_date).map(d => {
            const { origin_chain, destination_chain, asset, volume, usd_volume } = { ...d }
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
            const amount = formatUnits(volume || '0', decimals)
            return {
              ...d,
              origin_chain_data,
              destination_chain_data,
              asset_data,
              amount,
              volume: usd_volume || (amount * (price || 0)),
            }
          })

          // const transfers = toArray(await getDailyTransferMetrics({ router: `eq.${address?.toLowerCase()}`, transfer_date })).filter(d => d.transfer_date).map(d => {
          //   const { origin_chain, destination_chain } = { ...d }
          //   const origin_chain_data = getChainData(origin_chain, chains_data)
          //   const destination_chain_data = getChainData(destination_chain, chains_data)
          //   return { ...d, origin_chain_data, destination_chain_data }
          // })

          setData({ total_volume: _.sumBy(volumes, 'volume')/*, total_transfers: _.sumBy(transfers, 'transfer_count')*/ })
        }
      }
      getData()
    },
    [chains_data, assets_data, sdk],
  )

  const { total_volume, total_transfers } = { ...data }
  const metrics = liquidity && data && {
    liquidity: _.sumBy(liquidity, 'value'),
    volume: total_volume,
    transfers: total_transfers,
    // fee: 33.33,
    supported_chains: _.uniq(liquidity.map(d => d.chain_id)),
  }

  return (
    <>
      <div className="flex flex-col items-start space-y-4">
        <Metrics data={metrics} />
        <RouterLiquidity />
      </div>
      <div className="w-full grid xl:grid-cols-2 gap-6">
        <Assets data={liquidity} />
        <Transfers />
      </div>
    </>
  )
}