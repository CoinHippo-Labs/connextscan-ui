import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import TvlTotal from './tvl/total'
import Tvl from './tvl'
import VolumeTotal from './volume/total'
import Volume from './volume'
import TransfersTotal from './transfers/total'
import Transfers from './transfers'
import FeeTotal from './fee/total'
import Fee from './fee'
import SelectTimeframe from '../select/timeframe'
import { getDailyTransferMetrics, getDailyTransferVolum } from '../../lib/api/metrics'
import { getChainData, getAssetData, getContractData, TIMEFRAMES } from '../../lib/object'
import { formatUnits } from '../../lib/number'
import { toArray, equalsIgnoreCase } from '../../lib/utils'

export default () => {
  const { chains, assets, dev } = useSelector(state => ({ chains: state.chains, assets: state.assets, dev: state.dev }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { sdk } = { ...dev }

  const [timeframe, setTimeframe] = useState(TIMEFRAMES[1].day)
  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (chains_data && assets_data && sdk) {
          if (data) {
            setData(null)
          }

          const t = TIMEFRAMES.find(d => d.day === timeframe)
          const filters = {}
          if (t?.day) {
            filters.transfer_date = `gt.${moment().subtract(t.day, 'days').startOf('day').format('YYYY-MM-DD')}`
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
            top_chains_by_volume: _.slice(
              _.orderBy(
                Object.entries(_.groupBy(volumes, 'destination_chain')).map(([k, v]) => {
                  return {
                    chain_data: _.head(v)?.destination_chain_data,
                    volume: _.sumBy(v, 'volume'),
                  }
                }),
                ['volume'], ['asc'],
              ),
              0, 3,
            ),
            volumes: _.slice(
              _.orderBy(
                Object.entries(_.groupBy(volumes, 'timestamp')).map(([k, v]) => {
                  let volume_by_chains = _.orderBy(
                    Object.values(_.groupBy(v, 'destination_chain')).map(_v => {
                      const { destination_chain_data } = { ..._.head(_v) }
                      const { id, color } = { ...destination_chain_data }
                      return {
                        id,
                        color,
                        chain_data: destination_chain_data,
                        volume: _.sumBy(_v, 'volume'),
                        order: chains_data.findIndex(d => d.id === id),
                      }
                    }),
                    ['volume'], ['desc'],
                  )
                  volume_by_chains = _.orderBy(
                    _.concat(
                      volume_by_chains,
                      chains_data.filter(d => volume_by_chains.findIndex(_d => _d.id === d.id) < 0).map((d, i) => {
                        const { id, color } = { ...c }
                        return {
                          id,
                          color,
                          chain_data: d,
                          volume: 0,
                          order: i,
                        }
                      }),
                    ),
                    ['order'], ['asc'],
                  )
                  return {
                    timestamp: Number(k),
                    volume: _.sumBy(volume_by_chains, 'volume'),
                    volume_by_chains,
                  }
                }),
                ['timestamp'], ['asc'],
              ),
              -(timeframe || 52),
            ),
            total_transfers: _.sumBy(transfers, 'transfer_count'),
            top_chains_by_transfers: _.slice(
              _.orderBy(
                Object.entries(_.groupBy(transfers, 'destination_chain')).map(([k, v]) => {
                  return {
                    chain_data: _.head(v)?.destination_chain_data,
                    transfers: _.sumBy(v, 'transfer_count'),
                  }
                }),
                ['transfers'], ['asc'],
              ),
              0, 3,
            ),
            transfers: _.slice(
              _.orderBy(
                Object.entries(_.groupBy(transfers, 'timestamp')).map(([k, v]) => {
                  let transfers_by_chains = _.orderBy(
                    Object.values(_.groupBy(v, 'destination_chain')).map(_v => {
                      const { destination_chain_data } = { ..._.head(_v) }
                      const { id, color } = { ...destination_chain_data }
                      return {
                        id,
                        color,
                        chain_data: destination_chain_data,
                        transfers: _.sumBy(_v, 'transfer_count'),
                        order: chains_data.findIndex(d => d.id === id),
                      }
                    }),
                    ['transfers'], ['desc'],
                  )
                  transfers_by_chains = _.orderBy(
                    _.concat(
                      transfers_by_chains,
                      chains_data.filter(d => transfers_by_chains.findIndex(_d => _d.id === d.id) < 0).map((d, i) => {
                        const { id, color } = { ...c }
                        return {
                          id,
                          color,
                          chain_data: d,
                          transfers: 0,
                          order: i,
                        }
                      }),
                    ),
                    ['order'], ['asc'],
                  )
                  return {
                    timestamp: Number(k),
                    transfers: _.sumBy(transfers_by_chains, 'transfers'),
                    transfers_by_chains,
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
    [chains_data, assets_data, sdk, timeframe],
  )

  const { volumes, transfers, fees } = { ...data }

  return (
    <div className="grid lg:grid-cols-4 gap-4 mx-auto">
      <TvlTotal />
      <div className="lg:col-span-3">
        <Tvl />
      </div>
      <div className="lg:col-span-4 flex items-center justify-end">
        <SelectTimeframe value={timeframe} onSelect={t => setTimeframe(t)} />
      </div>
      <VolumeTotal data={data} />
      <div className="lg:col-span-3">
        <Volume
          timeframe={timeframe}
          stacked={true}
          volumes={volumes}
        />
      </div>
      <TransfersTotal data={data} />
      <div className="lg:col-span-3">
        <Transfers
          timeframe={timeframe}
          stacked={true}
          transfers={transfers}
        />
      </div>
      {/*<FeeTotal data={data} />
      <div className="lg:col-span-3">
        <Fee
          timeframe={timeframe}
          stacked={true}
          fees={fees}
        />
      </div>*/}
    </div>
  )
}