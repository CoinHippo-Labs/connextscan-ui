import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'

import Metrics from '../metrics'
import SelectTimeframe from '../select/timeframe'
import Volume from '../dashboard/volume'
import Transfers from '../dashboard/transfers'
import Fee from '../dashboard/fee'
import Assets from '../assets'
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

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    chain,
  } = { ...query }

  const [liquidity, setLiquidity] = useState(null)
  const [timeframe, setTimeframe] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    const getData = async is_interval => {
      if (
        chain &&
        sdk &&
        chains_data &&
        assets_data
      ) {
        const response =
          await sdk.nxtpSdkUtils
            .getRoutersData()

        if (
          Array.isArray(response) ||
          !is_interval
        ) {
          const chain_data = chains_data
            .find(c =>
              c?.id === chain
            )
          const {
            chain_id,
            domain_id,
          } = { ...chain_data }

          const data =
            (Array.isArray(response) ?
              response :
              []
            )
            .filter(l =>
              l?.domain === domain_id
            )
            .map(l => {
              const {
                local,
                balance,
              } = { ...l }

              let asset_data = assets_data
                .find(a =>
                  (a?.contracts || [])
                    .findIndex(c =>
                      c?.chain_id === chain_id &&
                      [
                        c?.next_asset?.contract_address,
                        c?.contract_address,
                      ]
                      .filter(_a => _a)
                      .findIndex(_a =>
                        equals_ignore_case(
                          _a,
                          local,
                        )
                      ) > -1
                    ) > -1
                )

              asset_data = {
                ...asset_data,
                ...(
                  (asset_data?.contracts || [])
                    .find(c =>
                      c?.chain_id === chain_id &&
                      [
                        c?.next_asset?.contract_address,
                        c?.contract_address,
                      ]
                      .filter(_a => _a)
                      .findIndex(_a =>
                        equals_ignore_case(
                          _a,
                          local,
                        )
                      ) > -1
                    )
                ),
              }

              if (asset_data.contracts) {
                delete asset_data.contracts
              }

              if (
                asset_data.next_asset &&
                equals_ignore_case(
                  asset_data.next_asset.contract_address,
                  local,
                )
              ) {
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

              const amount =
                Number(
                  utils.formatUnits(
                    BigNumber.from(
                      BigInt(
                        balance ||
                        0
                      )
                      .toString()
                    ),
                    // decimals ||
                    18,
                  )
                )

              return {
                ...l,
                chain_id,
                contract_address: local,
                amount,
                value:
                  amount *
                  (
                    price ||
                    0
                  ),
              }
            })

          setLiquidity(data)
        }
      }
    }

    getData()

    const interval =
      setInterval(() =>
        getData(true),
        0.5 * 60 * 1000,
      )

    return () => clearInterval(interval)
  }, [chain, sdk, chains_data, assets_data])

  useEffect(() => {
    const getData = async () => {
      if (
        chain &&
        sdk &&
        chains_data &&
        assets_data
      ) {
        const _timeframe = timeframes
          .find(t =>
            t?.day === timeframe
          )

        const chain_data = chains_data
          .find(c =>
            c?.id === chain
          )

        const {
          domain_id,
        } = { ...chain_data }

        let volumes =
          await daily_transfer_volume(
            {
              destination_chain: `eq.${domain_id}`,
            },
          )

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

            const origin_chain_data = chains_data
              .find(c =>
                c?.domain_id === origin_chain
              )
            const destination_chain_data = chains_data
              .find(c =>
                c?.domain_id === destination_chain
              )

            let asset_data = assets_data
              .find(a =>
                (a?.contracts || [])
                  .findIndex(c =>
                    c?.chain_id === origin_chain_data?.chain_id &&
                    [
                      c?.next_asset?.contract_address,
                      c?.contract_address,
                    ]
                    .filter(_a => _a)
                    .findIndex(_a =>
                      equals_ignore_case(
                        _a,
                        asset,
                      )
                    ) > -1
                  ) > -1
              )

            asset_data = {
              ...asset_data,
              ...(
                (asset_data?.contracts || [])
                .find(c =>
                  c?.chain_id === origin_chain_data?.chain_id &&
                  [
                    c?.next_asset?.contract_address,
                    c?.contract_address,
                  ]
                  .filter(_a => _a)
                  .findIndex(_a =>
                    equals_ignore_case(
                      _a,
                      asset,
                    )
                  ) > -1
                )
              ),
            }

            if (asset_data.contracts) {
              delete asset_data.contracts
            }

            if (asset_data.next_asset) {
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
                  // decimals ||
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

        let transfers =
          await daily_transfer_metrics(
            {
              destination_chain: `eq.${domain_id}`,
            },
          )

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
                    return {
                      timestamp: Number(k),
                      volume:
                        _.sumBy(
                          v,
                          'volume',
                        ),
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
                    return {
                      timestamp: Number(k),
                      transfers:
                        _.sumBy(
                          v,
                          'transfer_count',
                        ),
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
          },
        )
      }
    }

    getData()
  }, [chain, sdk, timeframe, chains_data, assets_data])

  const {
    total_volume,
    volumes,
    total_transfers,
    transfers,
    // fees,
  } = { ...data }

  const metrics =
    liquidity &&
    {
      liquidity:
        _.sumBy(
          liquidity,
          'value',
        ),
      volume: total_volume,
      transfers: total_transfers,
      // fee: 33.33,
    }

  return (
    <>
      <div className="mb-6">
        <Metrics
          data={metrics}
        />
      </div>
      <div className="grid lg:grid-cols-4 gap-4 mt-2 mb-6 mx-auto">
        <div className="lg:col-span-4 flex items-center justify-end">
          <SelectTimeframe
            value={timeframe}
            onSelect={t => setTimeframe(t)}
          />
        </div>
        <div className="lg:col-span-4">
          <Volume
            timeframe={timeframe}
            volumes={volumes}
          />
        </div>
        <div className="lg:col-span-4">
          <Transfers
            timeframe={timeframe}
            transfers={transfers}
          />
        </div>
        {/*<div className="lg:col-span-4">
          <Fee
            timeframe={timeframe}
            fees={fees}
          />
        </div>*/}
      </div>
      <div className="flex items-start justify-between space-x-2">
        <div className="w-full grid grid-flow-row lg:grid-cols-2 gap-4 mb-4">
          <Assets
            data={liquidity}
          />
        </div>
      </div>
    </>
  )
}