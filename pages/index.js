import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import BigNumber from 'bignumber.js'
import Loader from 'react-loader-spinner'

import TVL from '../components/tvl'
import TVLByChain from '../components/tvl/tvl-by-chain'
import TimeframeSelect from '../components/timeframe-select'
import Volume from '../components/stats/volume'
import VolumeByTime from '../components/stats/volume/volume-by-time'
import Transaction from '../components/stats/transaction'
import TransactionByTime from '../components/stats/transaction/transaction-by-time'
import TopChains from '../components/top-chains'
import TopTokens from '../components/top-tokens'
import Widget from '../components/widget'

import { daily } from '../lib/api/subgraph'
import { dayMetrics } from '../lib/api/opensearch'
import { isMatchRoute } from '../lib/routes'
import { timeframes, day_s, week_s } from '../lib/object/timeframe'
import { currency_symbol } from '../lib/object/currency'
import { numberFormat } from '../lib/utils'

import { STATS_DATA } from '../reducers/types'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function Index() {
  const dispatch = useDispatch()
  const { chains, tokens, stats, sdk } = useSelector(state => ({ chains: state.chains, tokens: state.tokens, stats: state.stats, sdk: state.sdk }), shallowEqual)
  const { chains_data } = { ...chains }
  const { tokens_data } = { ...tokens }
  const { stats_data } = { ...stats }
  const { sdk_data } = { ...sdk }

  const router = useRouter()
  const { pathname, asPath } = { ...router }
  const _asPath = asPath.includes('?') ? asPath.substring(0, asPath.indexOf('?')) : asPath

  const [tvlChainSelect, setTvlChainSelect] = useState(null)
  const [timeframeSelect, setTimeframeSelect] = useState(_.last(timeframes.filter(t => !t.disabled)))
  const [timeSelect, setTimeSelect] = useState(null)
  const [dayMetricsData, setDayMetricsData] = useState(null)
  const [timesData, setTimesData] = useState(null)

  useEffect(() => {
    const controller = new AbortController()

    const getData = async () => {
      if (timeframeSelect) {
        if (!controller.signal.aborted) {
          const response = await dayMetrics({
            aggs: {
              chains: {
                terms: { field: 'chain_id', size: 1000 },
                aggs: {
                  day_metrics: {
                    terms: { field: 'dayStartTimestamp', size: 1000 },
                    aggs: {
                      versions: {
                        terms: { field: 'version.keyword' },
                      },
                      sending_txs: {
                        sum: { field: 'sendingTxCount' },
                      },
                      receiving_txs: {
                        sum: { field: 'receivingTxCount' },
                      },
                      cancel_txs: {
                        sum: { field: 'cancelTxCount' },
                      },
                      volume_values: {
                        sum: { field: 'volume_value' },
                      },
                      volume_in_values: {
                        sum: { field: 'volumeIn_value' },
                      },
                      relayer_fee_values: {
                        sum: { field: 'relayerFee_value' },
                      },
                    },
                  },
                },
              },
            },
          })

          setDayMetricsData(response?.data || {})
        }
      }
    }

    getData()

    return () => {
      controller?.abort()
    }
  }, [timeframeSelect])

  useEffect(() => {
    const controller = new AbortController()

    const getDaily = async (chain, data, today) => {
      if (chain && today && tokens_data?.findIndex(t => t?.chain_id === chain.chain_id) > -1) {
        const response = await daily(sdk_data, { chain_id: chain.chain_id, where: `{ dayStartTimestamp_gte: ${moment(today).subtract((data?.[`${chain.chain_id}`] || []).length > 0 ? 1 : 3000, 'days').unix()} }` })

        const _data = Object.entries(_.groupBy(response?.data || [], 'dayStartTimestamp')).map(([key, value]) => {
          value =  value.map(v => {
            const token = tokens_data.find(t => t?.chain_id === chain.chain_id && t?.contract_address === v?.assetId?.toLowerCase())
            const decimals = token?.contract_decimals
            const price = token?.price

            const volume = decimals && BigNumber(!isNaN(v?.volume) ? v.volume : 0).shiftedBy(-decimals).toNumber()
            const volumeIn = decimals && BigNumber(!isNaN(v?.volumeIn) ? v.volumeIn : 0).shiftedBy(-decimals).toNumber()
            const relayerFee = decimals && BigNumber(!isNaN(v?.relayerFee) ? v.relayerFee : 0).shiftedBy(-decimals).toNumber()

            return {
              ...v,
              volume,
              volumeIn,
              relayerFee,
              volume_value: price * volume,
              volumeIn_value: price * volumeIn,
              relayerFee_value: price * relayerFee, 
            }
          })

          return {
            id: `${chain.chain_id}_${key}`,
            chain_id: chain.chain_id,
            dayStartTimestamp: Number(key),
            sendingTxCount: _.sumBy(value, 'sendingTxCount'),
            receivingTxCount: _.sumBy(value, 'receivingTxCount'),
            cancelTxCount: _.sumBy(value, 'cancelTxCount'),
            volume_value: _.sumBy(value, 'volume_value'),
            volumeIn_value: _.sumBy(value, 'volumeIn_value'),
            relayerFee_value:  _.sumBy(value, 'relayerFee_value'),
          }
        })

        dispatch({
          type: STATS_DATA,
          value: {
            [`${chain.chain_id}`]: _.concat(_data, data?.[`${chain.chain_id}`]?.filter(d => !(_data.findIndex(_d => _d?.dayStartTimestamp === d?.dayStartTimestamp) > -1)) || []),
          },
        })
      }
    }

    const getData = async () => {
      if (sdk_data && chains_data && tokens_data && dayMetricsData && chains_data.filter(c => !c?.disabled && !c?.is_staging && Object.keys(dayMetricsData).includes(c?.chain_id)).length <= Object.keys(_.groupBy(tokens_data, 'chain_id')).length) {
        const today = moment().utc().startOf('day')
        chains_data.forEach(c => getDaily(c, dayMetricsData, today))
      }
    }

    getData()

    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [chains_data, tokens_data, dayMetricsData, sdk_data])

  useEffect(() => {
    if (stats_data) {
      const today = moment().utc().startOf('day')

      let data = _.orderBy(Object.entries(_.groupBy(Object.values(stats_data).flatMap(t => t), 'dayStartTimestamp')).map(([key, value]) => {
        return {
          time: Number(key),
          assets: _.groupBy(value, 'chain_id'),
          volume_value: _.sumBy(value, 'volume_value'),
          volumeIn_value: _.sumBy(value, 'volumeIn_value'),
          receivingTxCount: _.sumBy(value, 'receivingTxCount'),
          sendingTxCount: _.sumBy(value, 'sendingTxCount'),
          cancelTxCount: _.sumBy(value, 'cancelTxCount'),
        }
      }).map(t => {
        return {
          ...t,
          volume_value_by_chain: Object.fromEntries(Object.entries(t.assets).map(([key, value]) => [key, _.sumBy(value, 'volume_value')])),
          receivingTxCount_by_chain: Object.fromEntries(Object.entries(t.assets).map(([key, value]) => [key, _.sumBy(value, 'receivingTxCount')])),
        }
      }), ['time'], ['asc'])

      const _data = _.cloneDeep(data)

      if (_data) {
        data = []

        const since = _.minBy(_data, 'time')?.time
        const diffSince = moment(today).diff(moment(since * 1000), 'days')
        const startTime = moment(today).subtract(timeframeSelect?.day || diffSince, 'days').startOf(timeframeSelect?.day ? 'day' : 'week').unix()

        for (let time = startTime; time <= today.unix(); time += (timeframeSelect?.day ? day_s : week_s)) {
          const times_data = _data.filter(t => moment(t.time * 1000).utc().startOf(timeframeSelect?.day ? 'day' : 'week').unix() === time)

          data.push({
            time,
            assets: times_data.flatMap(d => d?.assets || []),
            volume_value: _.sumBy(times_data, 'volume_value'),
            volumeIn_value: _.sumBy(times_data, 'volumeIn_value'),
            receivingTxCount: _.sumBy(times_data, 'receivingTxCount'),
            sendingTxCount: _.sumBy(times_data, 'sendingTxCount'),
            cancelTxCount: _.sumBy(times_data, 'cancelTxCount'),
            volume_value_by_chain: Object.fromEntries(Object.entries(_.groupBy(
              times_data.flatMap(d => Object.entries(d?.volume_value_by_chain || {}).map(([key, value]) => {
                return {
                  key,
                  value,
                }
              })
            ), 'key')).map(([key, value]) => [key, _.sumBy(value, 'value')])),
            receivingTxCount_by_chain: Object.fromEntries(Object.entries(_.groupBy(
              times_data.flatMap(d => Object.entries(d?.receivingTxCount_by_chain || {}).map(([key, value]) => {
                return {
                  key,
                  value,
                }
              })
            ), 'key')).map(([key, value]) => [key, _.sumBy(value, 'value')])),
          })
        }

        data = data.map((t, i) => {
          return {
            ...t,
            time_string: i % (data.length > 10 ? 2 : 1) === 0 && moment(t.time * 1000).utc().format(timeframeSelect?.day && data.length > 10 ? 'DD' : 'D MMM'),
          }
        })

        setTimesData(data)
      }
    }
  }, [timeframeSelect, stats_data])

  if (typeof window !== 'undefined' && pathname !== _asPath) {
    router.push(isMatchRoute(_asPath) ? asPath : '/')
  }

  if (typeof window === 'undefined' || pathname !== _asPath) {
    return (
      <span className="min-h-screen" />
    )
  }

  const timeData = timesData?.find(t => t?.time === timeSelect) || _.last(timesData)

  return (
    <>
      <div className="max-w-8xl space-y-4 sm:space-y-8 xl:space-y-12 my-6 xl:mb-8 mx-auto">
        <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-4 gap-4 xl:gap-6">
          <Widget
            title={<span className="uppercase text-black dark:text-white text-base sm:text-lg font-semibold">TVL</span>}
            right={<span className="whitespace-nowrap font-mono text-gray-500 dark:text-gray-500 text-2xs md:text-3xs xl:text-xs font-light">
              {moment().utc().format('MMM D, YYYY h:mm:ss A [(UTC)]')}
            </span>}
            className="col-span-1 border-0 shadow-md rounded-2xl py-4 px-5"
          >
            <TVL chainId={tvlChainSelect} />
          </Widget>
          <Widget
            title={<span className="uppercase text-black dark:text-white text-base sm:text-lg font-semibold">TVL by Chain</span>}
            right={chains_data && (
              <span className="flex items-center text-gray-500 dark:text-gray-500 text-base space-x-1.5">
                <span className="font-mono">{chains_data.filter(c => !c?.disabled).length}</span>
                <span>Chains</span>
              </span>
            )}
            className="col-span-1 sm:col-span-3 border-0 shadow-md rounded-2xl py-4 px-5"
          >
            <TVLByChain selectChainId={chain_id => setTvlChainSelect(chain_id)} />
          </Widget>
        </div>
        <div className="space-y-3">
          <div className="flex items-center justify-end">
            <TimeframeSelect
              timeframe={timeframeSelect}
              onClick={t => setTimeframeSelect(t)}
            />
          </div>
          <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-4 gap-4 xl:gap-6">
            <Widget
              title={<span className="uppercase text-black dark:text-white text-base sm:text-lg font-semibold">Volume</span>}
              right={timesData && (
                <span className="whitespace-nowrap font-mono text-gray-500 dark:text-gray-500 text-2xs md:text-3xs xl:text-xs font-light">
                  {timeSelect && timeData ?
                    <>
                      {moment(timeData.time * 1000).utc().format(timeframeSelect?.day ? 'MMM D, YYYY' : 'D MMM')}
                      {!timeframeSelect?.day && (
                        <>
                          <> - </>
                          {moment(timeData.time * 1000).utc().endOf('week').format('D MMM YYYY')}
                        </>
                      )}
                    </>
                    :
                    <>since {moment(_.head(timesData).time * 1000).utc().format('MMM D, YYYY [(UTC)]')}</>
                  }
                </span>
              )}
              className="col-span-1 border-0 shadow-md rounded-2xl py-4 px-5"
            >
              <Volume
                data={timesData}
                timeSelect={timeSelect}
              />
            </Widget>
            <Widget
              title={<span className="uppercase text-black dark:text-white text-base sm:text-lg font-semibold">Volume by {timeframeSelect && !timeframeSelect.day ? 'Week' : 'Day'}</span>}
              right={timeData && (
                <div className="flex flex-col items-end">
                  <span className="font-mono text-lg font-semibold">
                    {currency_symbol}{numberFormat(timeData.volume_value, timeData.volume_value > 1000 ? '0,0' : '0,0.00')}
                  </span>
                  <span className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-500">
                    {moment(timeData.time * 1000).utc().format(timeframeSelect?.day ? 'MMM D, YYYY' : 'D MMM')}
                    {!timeframeSelect?.day && (
                      <>
                        <> - </>
                        {moment(timeData.time * 1000).utc().endOf('week').format('D MMM YYYY')}
                      </>
                    )}
                  </span>
                </div>
              )}
              contentClassName="items-start"
              className="col-span-1 sm:col-span-3 border-0 shadow-md rounded-2xl py-4 px-5"
            >
              <VolumeByTime
                data={timesData}
                selectTime={time => setTimeSelect(time)}
              />
            </Widget>
            <Widget
              title={<span className="uppercase text-black dark:text-white text-base sm:text-lg font-semibold">Transactions</span>}
              right={timesData && (
                <span className="whitespace-nowrap font-mono text-gray-500 dark:text-gray-500 text-2xs md:text-3xs xl:text-xs font-light">
                  {timeSelect && timeData ?
                    <>
                      {moment(timeData.time * 1000).utc().format(timeframeSelect?.day ? 'MMM D, YYYY' : 'D MMM')}
                      {!timeframeSelect?.day && (
                        <>
                          <> - </>
                          {moment(timeData.time * 1000).utc().endOf('week').format('D MMM YYYY')}
                        </>
                      )}
                    </>
                    :
                    <>since {moment(_.head(timesData).time * 1000).utc().format('MMM D, YYYY [(UTC)]')}</>
                  }
                </span>
              )}
              className="col-span-1 border-0 shadow-md rounded-2xl py-4 px-5"
            >
              <Transaction
                data={timesData}
                timeSelect={timeSelect}
              />
            </Widget>
            <Widget
              title={<span className="uppercase text-black dark:text-white text-base sm:text-lg font-semibold">Transactions by {timeframeSelect && !timeframeSelect.day ? 'Week' : 'Day'}</span>}
              right={timeData && (
                <div className="flex flex-col items-end">
                  <span className="font-mono text-lg font-semibold">
                    {numberFormat(timeData.receivingTxCount, '0,0')}
                  </span>
                  <span className="whitespace-nowrap text-sm text-gray-500 dark:text-gray-500">
                    {moment(timeData.time * 1000).utc().format(timeframeSelect?.day ? 'MMM D, YYYY' : 'D MMM')}
                    {!timeframeSelect?.day && (
                      <>
                        <> - </>
                        {moment(timeData.time * 1000).utc().endOf('week').format('D MMM YYYY')}
                      </>
                    )}
                  </span>
                </div>
              )}
              contentClassName="items-start"
              className="col-span-1 sm:col-span-3 border-0 shadow-md rounded-2xl py-4 px-5"
            >
              <TransactionByTime
                data={timesData}
                selectTime={time => setTimeSelect(time)}
              />
            </Widget>
          </div>
        </div>
        <div className="grid grid-flow-row grid-cols-1 xl:grid-cols-2 gap-4 sm:gap-8 xl:gap-10">
          <div className="space-y-2">
            <div className="uppercase text-base sm:text-lg font-semibold mx-3">Top Chains by Volume</div>
            <div>
              <TopChains className="no-border" />
            </div>
          </div>
          <div className="space-y-2">
            <div className="uppercase text-base sm:text-lg font-semibold mx-3">Top Tokens by Liquidity</div>
            <div>
              <TopTokens className="no-border" />
            </div>
          </div>
        </div>
      </div>
      <div className="dark:bg-black dark:bg-blue-500 dark:bg-yellow-500 dark:bg-green-400 dark:bg-green-600 dark:bg-red-700 dark:bg-gray-700 bg-blue-400" />
    </>
  )
}