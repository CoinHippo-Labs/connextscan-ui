import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { utils } from 'ethers'

import TvlTotal from './tvl/total'
import Tvl from './tvl'
import SelectTimeframe from '../select-options/timeframe'
import VolumeTotal from './volume/total'
import Volume from './volume'
import TransfersTotal from './transfers/total'
import Transfers from './transfers'
import FeeTotal from './fee/total'
import Fee from './fee'
import { daily_transfer_metrics, daily_transfer_volume } from '../../lib/api/metrics'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { timeframes } from '../../lib/object/timeframe'
import { toArray, equalsIgnoreCase } from '../../lib/utils'

export default () => {
  const {
    chains,
    assets,
    pools,
    dev,
  } = useSelector(
    state => (
      {
        chains: state.chains,
        assets: state.assets,
        pools: state.pools,
        dev: state.dev,
      }
    ),
    shallowEqual,
  )
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    pools_data,
  } = { ...pools }
  const {
    sdk,
  } = { ...dev }

  const [timeframe, setTimeframe] = useState(null)
  const [data, setData] = useState(null)

  useEffect(
    () => {
      const getData = async () => {
        if (sdk && chains_data && assets_data) {
          const _timeframe = timeframes.find(t => t?.day === timeframe)

          const volumes =
            toArray(await daily_transfer_volume())
              .filter(v => v.transfer_date)
              .map((v, i) => {
                const {
                  transfer_date,
                  origin_chain,
                  destination_chain,
                  asset,
                  volume,
                  usd_volume,
                } = { ...v }

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

                const {
                  decimals,
                  price,
                } = { ...asset_data }

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
            toArray(await daily_transfer_metrics())
              .filter(t => t.transfer_date)
              .map(t => {
                const {
                  transfer_date,
                  origin_chain,
                  destination_chain,
                } = { ...t }

                const origin_chain_data = getChain(origin_chain, chains_data)
                const destination_chain_data = getChain(destination_chain, chains_data)

                return {
                  ...t,
                  timestamp: moment(transfer_date, 'YYYY-MM-DD').startOf(_timeframe?.timeframe).valueOf(),
                  origin_chain_data,
                  destination_chain_data,
                }
              })

          setData(
            {
              total_volume: _.sumBy(volumes, 'volume'),
              top_chains_by_volume:
                _.slice(
                  _.orderBy(
                    Object.entries(_.groupBy(volumes, 'destination_chain'))
                      .map(([k, v]) => {
                        return {
                          chain_data: _.head(v)?.destination_chain_data,
                          volume: _.sumBy(v, 'volume'),
                        }
                      }),
                    ['volume'],
                    ['desc'],
                  ),
                  0,
                  3,
                ),
              volumes:
                _.slice(
                  _.orderBy(
                    Object.entries(_.groupBy(volumes, 'timestamp'))
                      .map(([k, v]) => {
                        let volume_by_chains =
                          _.orderBy(
                            Object.values(_.groupBy(v, 'destination_chain'))
                              .map(_v => {
                                const {
                                  destination_chain_data,
                                } = { ..._.head(_v) }

                                const {
                                  id,
                                  color,
                                } = { ...destination_chain_data }

                                return {
                                  id,
                                  color,
                                  chain_data: destination_chain_data,
                                  volume: _.sumBy(_v, 'volume'),
                                  order: chains_data.findIndex(c => c?.id === id),
                                }
                              }),
                            ['volume'],
                            ['desc'],
                          )

                        volume_by_chains =
                          _.orderBy(
                            _.concat(
                              volume_by_chains,
                              chains_data
                                .filter(c => volume_by_chains.findIndex(t => t.id === c?.id) < 0)
                                .map((c, i) => {
                                  const {
                                    id,
                                    color,
                                  } = { ...c }

                                  return {
                                    id,
                                    color,
                                    chain_data: c,
                                    volume: 0,
                                    order: i,
                                  }
                                }),
                            ),
                            ['order'],
                            ['asc'],
                          )

                        return {
                          timestamp: Number(k),
                          volume: _.sumBy(volume_by_chains, 'volume'),
                          volume_by_chains,
                        }
                      }),
                    ['timestamp'],
                    ['asc'],
                  ),
                  -(timeframe || 52),
                ),
              total_transfers: _.sumBy(transfers, 'transfer_count'),
              top_chains_by_transfers:
                _.slice(
                  _.orderBy(
                    Object.entries(_.groupBy(transfers, 'destination_chain'))
                      .map(([k, v]) => {
                        return {
                          chain_data: _.head(v)?.destination_chain_data,
                          transfers: _.sumBy(v, 'transfer_count'),
                        }
                      }),
                    ['transfers'],
                    ['desc'],
                  ),
                  0,
                  3,
                ),
              transfers:
                _.slice(
                  _.orderBy(
                    Object.entries(_.groupBy(transfers, 'timestamp'))
                      .map(([k, v]) => {
                        let transfers_by_chains =
                          _.orderBy(
                            Object.values(_.groupBy(v, 'destination_chain'))
                              .map(_v => {
                                const {
                                  destination_chain_data,
                                } = { ..._.head(_v) }

                                const {
                                  id,
                                  color,
                                } = { ...destination_chain_data }

                                return {
                                  id,
                                  color,
                                  chain_data: destination_chain_data,
                                  transfers: _.sumBy(_v, 'transfer_count'),
                                  order: chains_data.findIndex(c => c?.id === id),
                                }
                              }),
                            ['transfers'],
                            ['desc'],
                          )

                        transfers_by_chains =
                          _.orderBy(
                            _.concat(
                              transfers_by_chains,
                              chains_data
                                .filter(c => transfers_by_chains.findIndex(t => t.id === c?.id) < 0)
                                .map((c, i) => {
                                  const {
                                    id,
                                    color,
                                  } = { ...c }

                                  return {
                                    id,
                                    color,
                                    chain_data: c,
                                    transfers: 0,
                                    order: i,
                                  }
                                }),
                            ),
                            ['order'],
                            ['asc'],
                          )

                        return {
                          timestamp: Number(k),
                          transfers: _.sumBy(transfers_by_chains, 'transfers'),
                          transfers_by_chains,
                        }
                      }),
                    ['timestamp'],
                    ['asc'],
                  ),
                  -(timeframe || 52),
                ),
            },
          )
        }
      }

      getData()
    },
    [sdk, timeframe, chains_data, assets_data],
  )

  const {
    volumes,
    transfers,
    fees,
  } = { ...data }

  return (
    <div className="grid lg:grid-cols-4 gap-4 mt-2 mb-6 mx-auto">
      <TvlTotal />
      <div className="lg:col-span-3">
        <Tvl />
      </div>
      <div className="lg:col-span-4 flex items-center justify-end">
        <SelectTimeframe
          value={timeframe}
          onSelect={t => setTimeframe(t)}
        />
      </div>
      <VolumeTotal
        data={data}
      />
      <div className="lg:col-span-3">
        <Volume
          timeframe={timeframe}
          stacked={true}
          volumes={volumes}
        />
      </div>
      <TransfersTotal
        data={data}
      />
      <div className="lg:col-span-3">
        <Transfers
          timeframe={timeframe}
          stacked={true}
          transfers={transfers}
        />
      </div>
      {/*
        <FeeTotal
          data={data}
        />
        <div className="lg:col-span-3">
          <Fee
            timeframe={timeframe}
            stacked={true}
            fees={fees}
          />
        </div>
      */}
    </div>
  )
}