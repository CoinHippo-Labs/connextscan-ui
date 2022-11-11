import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'

import TvlTotal from './tvl/total'
import Tvl from './tvl'
import SelectTimeframe from '../select/timeframe'
import VolumeTotal from './volume/total'
import Volume from './volume'
import TransfersTotal from './transfers/total'
import Transfers from './transfers'
import FeeTotal from './fee/total'
import Fee from './fee'
import { daily_transfer_metrics, daily_transfer_volume } from '../../lib/api/metrics'
import { timeframes } from '../../lib/object/timeframe'
import { equals_ignore_case } from '../../lib/utils'

export default () => {
  const {
    chains,
    assets,
    dev,
  } = useSelector(state =>
    (
      {
        chains: state.chains,
        assets: state.assets,
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
    sdk,
  } = { ...dev }

  const [timeframe, setTimeframe] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (
        sdk &&
        chains_data &&
        assets_data
      ) {
        const _timeframe = timeframes.find(t => t?.day === timeframe)

        let volumes = await daily_transfer_volume()

        volumes =
          (Array.isArray(volumes) ?
            volumes :
            []
          )
          .map(v => {
            const {
              transfer_date,
              origin_chain,
              destination_chain,
              asset,
              volume,
            } = { ...v }

            const origin_chain_data = chains_data.find(c => c?.domain_id === origin_chain)
            const destination_chain_data = chains_data.find(c => c?.domain_id === destination_chain)

            let asset_data = assets_data.find(a =>
              a?.contracts?.findIndex(c => c?.chain_id ===
                origin_chain_data?.chain_id &&
                equals_ignore_case(c?.contract_address, asset)
              ) > -1
            )

            asset_data = {
              ...asset_data,
              ...asset_data?.contracts?.find(c =>
                c?.chain_id === origin_chain_data?.chain_id &&
                equals_ignore_case(c?.contract_address, asset)
              ),
            }

            if (asset_data?.contracts) {
              delete asset_data.contracts
            }

            const {
              decimals,
              price,
            } = { ...asset_data }

            const amount =
              Number(
                utils.formatUnits(
                  BigNumber.from(
                    BigInt(
                      volume ||
                      0
                    )
                    .toString()
                  ),
                  decimals ||
                  18,
                )
              )

            return {
              ...v,
              timestamp:
                moment(
                  transfer_date,
                  'YYYY-MM-DD',
                )
                .startOf(_timeframe?.timeframe)
                .valueOf(),
              origin_chain_data,
              destination_chain_data,
              asset_data,
              amount,
              volume:
                amount *
                (
                  price ||
                  0
                ),
            }
          })

        let transfers = await daily_transfer_metrics()

        transfers =
          (Array.isArray(transfers) ?
            transfers :
            []
          )
          .map(t => {
            const {
              transfer_date,
              origin_chain,
              destination_chain,
            } = { ...t }

            const origin_chain_data = chains_data
              .find(c =>
                c?.domain_id === origin_chain
              )

            const destination_chain_data = chains_data
              .find(c =>
                c?.domain_id === destination_chain
              )

            return {
              ...t,
              timestamp:
                moment(
                  transfer_date,
                  'YYYY-MM-DD',
                )
                .startOf(_timeframe?.timeframe)
                .valueOf(),
              origin_chain_data,
              destination_chain_data,
            }
          })

        setData(
          {
            total_volume:
              _.sumBy(
                volumes,
                'volume',
              ),
            top_chains_by_volume:
              _.slice(
                _.orderBy(
                  Object.entries(
                    _.groupBy(
                      volumes,
                      'destination_chain',
                    )
                  )
                  .map(([k, v]) => {
                    return {
                      chain_data: _.head(v)?.destination_chain_data,
                      volume:
                        _.sumBy(
                          v,
                          'volume',
                        ),
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
                  Object.entries(
                    _.groupBy(
                      volumes,
                      'timestamp',
                    )
                  )
                  .map(([k, v]) => {
                    let volume_by_chains =
                      _.orderBy(
                        Object.values(
                          _.groupBy(
                            v,
                            'destination_chain',
                          )
                        )
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
                            volume:
                              _.sumBy(
                                _v,
                                'volume',
                              ),
                            order:
                              chains_data
                                .findIndex(c =>
                                  c?.id === id
                                ),
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
                            .filter(c =>
                              volume_by_chains
                                .findIndex(t =>
                                  t.id === c?.id
                                ) < 0
                            )
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
                            })
                        ),
                        ['order'],
                        ['asc'],
                      )

                    return {
                      timestamp: Number(k),
                      volume:
                        _.sumBy(
                          volume_by_chains,
                          'volume',
                        ),
                      volume_by_chains,
                    }
                  }),
                  ['timestamp'],
                  ['asc'],
                ),
                -(
                  timeframe ||
                  52
                ),
              ),
            total_transfers:
              _.sumBy(
                transfers,
                'transfer_count',
              ),
            top_chains_by_transfers:
              _.slice(
                _.orderBy(
                  Object.entries(
                    _.groupBy(
                      transfers,
                      'destination_chain',
                    )
                  )
                  .map(([k, v]) => {
                    return {
                      chain_data: _.head(v)?.destination_chain_data,
                      transfers:
                        _.sumBy(
                          v,
                          'transfer_count',
                        ),
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
                  Object.entries(
                    _.groupBy(
                      transfers,
                      'timestamp',
                    )
                  )
                  .map(([k, v]) => {
                    let transfers_by_chains =
                      _.orderBy(
                        Object.values(
                          _.groupBy(
                            v,
                            'destination_chain',
                          )
                        )
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
                            transfers:
                              _.sumBy(
                                _v,
                                'transfer_count',
                              ),
                            order:
                              chains_data
                                .findIndex(c =>
                                  c?.id === id
                                ),
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
                            .filter(c =>
                              transfers_by_chains
                                .findIndex(t =>
                                  t.id === c?.id
                                ) < 0
                            )
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
                            })
                        ),
                        ['order'],
                        ['asc'],
                      )

                    return {
                      timestamp: Number(k),
                      transfers:
                        _.sumBy(
                          transfers_by_chains,
                          'transfers',
                        ),
                      transfers_by_chains,
                    }
                  }),
                  ['timestamp'],
                  ['asc'],
                ),
                -(
                  timeframe ||
                  52
                ),
              ),
            /*total_fee: 10000,
            top_chains_by_fee:
              _.slice(
                chains_data
                  .map(c => {
                    return {
                      chain_data: c,
                      fee: 1000,
                    }
                  }
                ),
                0,
                3,
              ),
            fees: [...Array(timeframe || 30).keys()]
              .map(i => {
                const fee_by_chains =
                  _.orderBy(
                    chains_data
                      .map(c => {
                        const {
                          id,
                          color,
                        } = { ...c }
                        return {
                          id,
                          color,
                          chain_data: c,
                          fee:
                            10 *
                            Math.ceil(
                              Math.random(0, 1) * 10
                            ) /
                            Math.ceil(
                              Math.random(0, 1) * 100
                            ),
                        }
                      }),
                    ['fee'],
                    ['desc'],
                  )

                return {
                  timestamp:
                    moment()
                      .subtract(
                        (timeframe || 30) - i,
                        _timeframe?.timeframe
                      )
                      .startOf(_timeframe?.timeframe)
                      .valueOf(),
                  fee:
                    _.sumBy(
                      fee_by_chains,
                      'fee',
                    ),
                  fee_by_chains,
                }
              }),*/
          },
        )
      }
    }

    getData()
  }, [sdk, timeframe, chains_data, assets_data])

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
      {/*<FeeTotal
        data={data}
      />
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