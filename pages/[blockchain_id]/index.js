import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Web3 from 'web3'
import { utils } from 'ethers'
import BigNumber from 'bignumber.js'

import Assets from '../../components/assets'
import TimeframeSelect from '../../components/timeframe-select'
import Volume from '../../components/stats/volume'
import VolumeByTime from '../../components/stats/volume/volume-by-time'
import Transaction from '../../components/stats/transaction'
import TransactionByTime from '../../components/stats/transaction/transaction-by-time'
import Transactions from '../../components/transactions'
import Widget from '../../components/widget'

import { daily } from '../../lib/api/subgraph'
import { dayMetrics } from '../../lib/api/opensearch'
import { timeframes, day_s, week_s } from '../../lib/object/timeframe'
import { currency_symbol } from '../../lib/object/currency'
import { numberFormat } from '../../lib/utils'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function BlockchainIndex() {
  const { chains, tokens, routers_assets } = useSelector(state => ({ chains: state.chains, tokens: state.tokens, routers_assets: state.routers_assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { tokens_data } = { ...tokens }
  const { routers_assets_data } = { ...routers_assets }

  const router = useRouter()
  const { query } = { ...router }
  const { blockchain_id } = { ...query }

  const [assetBy, setAssetBy] = useState('assets')
  const [timeframeSelect, setTimeframeSelect] = useState(_.last(timeframes.filter(t => !t.disabled)))
  const [timeSelect, setTimeSelect] = useState(null)
  const [dayMetricsData, setDayMetricsData] = useState(null)
  const [statsData, setStatsData] = useState(null)
  const [timesData, setTimesData] = useState(null)
  const [web3, setWeb3] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [addTokenData, setAddTokenData] = useState(null)

  useEffect(() => {
    if (!web3) {
      setWeb3(new Web3(Web3.givenProvider))
    }
    else {
      try {
        web3.currentProvider._handleChainChanged = e => {
          try {
            setChainId(Web3.utils.hexToNumber(e?.chainId))
          } catch (error) {}
        }
      } catch (error) {}
    }
  }, [web3])

  useEffect(() => {
    if (addTokenData?.chain_id === chainId && addTokenData?.contract) {
      addTokenToMetaMask(addTokenData.chain_id, addTokenData.contract)
    }
  }, [chainId, addTokenData])

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
                      assets: {
                        terms: { field: 'assetId.keyword', size: 1000 },
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
                          // volume_values: {
                          //   sum: { field: 'volume_value' },
                          // },
                          // volume_in_values: {
                          //   sum: { field: 'volumeIn_value' },
                          // },
                          // relayer_fee_values: {
                          //   sum: { field: 'relayerFee_value' },
                          // },
                        },
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
        const response = await daily({ chain_id: chain.chain_id, where: `{ dayStartTimestamp_gte: ${moment(today).subtract((data?.[`${chain.chain_id}`] || []).length > 0 ? 1 : 3000, 'days').unix()} }` })
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
              token,
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
            tokens: value,
            dayStartTimestamp: Number(key),
            sendingTxCount: _.sumBy(value, 'sendingTxCount'),
            receivingTxCount: _.sumBy(value, 'receivingTxCount'),
            cancelTxCount: _.sumBy(value, 'cancelTxCount'),
            volume_value: _.sumBy(value, 'volume_value'),
            volumeIn_value: _.sumBy(value, 'volumeIn_value'),
            relayerFee_value:  _.sumBy(value, 'relayerFee_value'),
          }
        })
        setStatsData({
          [`${chain.chain_id}`]: _.concat(_data, data?.[`${chain.chain_id}`]?.filter(d => !(_data.findIndex(_d => _d?.dayStartTimestamp === d?.dayStartTimestamp) > -1)) || []),
        })
      }
      else {
        setStatsData({
          [`${chain.chain_id}`]: [],
        })
      }
    }

    const getData = () => {
      if (chains_data && tokens_data && dayMetricsData) {
        const today = moment().utc().startOf('day')
        const c = chains_data?.find(c => c?.id === blockchain_id)
        getDaily(c, dayMetricsData, today)
      }
    }

    getData()

    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [blockchain_id, chains_data, tokens_data, dayMetricsData])

  useEffect(() => {
    if (statsData) {
      const today = moment().utc().startOf('day')

      let data = _.orderBy(Object.entries(_.groupBy(Object.values(statsData).flatMap(t => t), 'dayStartTimestamp')).map(([key, value]) => {
        return {
          time: Number(key),
          assets: _.groupBy(value, 'chain_id'),
          tokens: _.groupBy(value?.flatMap(v => v?.tokens).map(t => {
            return {
              ...t,
              token: t?.token || tokens_data?.find(_t => _t?.id === t?.id),
            }
          }) || [], 'token.id'),
          volume_value: _.sumBy(value, 'volume_value'),
          volumeIn_value: _.sumBy(value, 'volumeIn_value'),
          receivingTxCount: _.sumBy(value, 'receivingTxCount'),
          sendingTxCount: _.sumBy(value, 'sendingTxCount'),
          cancelTxCount: _.sumBy(value, 'cancelTxCount'),
        }
      }).map(t => {
        return {
          ...t,
          totalTxCount: _.sum([t.receivingTxCount, t.sendingTxCount, t.cancelTxCount]),
          volume_value_by_chain: Object.fromEntries(Object.entries(t.assets).map(([key, value]) => [key, _.sumBy(value, 'volume_value')])),
          receivingTxCount_by_chain: Object.fromEntries(Object.entries(t.assets).map(([key, value]) => [key, _.sumBy(value, 'receivingTxCount')])),
          volume_value_by_token: Object.fromEntries(Object.entries(t.tokens).map(([key, value]) => [key, _.sumBy(value, 'volume_value')])),
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
            totalTxCount: _.sum([_.sumBy(times_data, 'receivingTxCount'), _.sumBy(times_data, 'sendingTxCount'), _.sumBy(times_data, 'cancelTxCount')]),
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
            volume_value_by_token: Object.fromEntries(Object.entries(_.groupBy(
              times_data.flatMap(d => Object.entries(d?.volume_value_by_token || {}).map(([key, value]) => {
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
  }, [timeframeSelect, statsData])

  const addTokenToMetaMask = async (chain_id, contract) => {
    if (web3 && contract) {
      if (chain_id === chainId) {
        try {
          const response = await web3.currentProvider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: contract.contract_address,
                symbol: contract.symbol,
                decimals: contract.contract_decimals,
                image: `${contract.image?.startsWith('/') ? process.env.NEXT_PUBLIC_SITE_URL : ''}${contract.image}`,
              },
            },
          })
        } catch (error) {}

        setAddTokenData(null)
      }
      else {
        switchNetwork(chain_id, contract)
      }
    }
  }

  const switchNetwork = async (chain_id, contract) => {
    try {
      await web3.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: utils.hexValue(chain_id) }],
      })
    } catch (error) {
      if (error.code === 4902) {
        try {
          await web3.currentProvider.request({
            method: 'wallet_addEthereumChain',
            params: chains_data?.find(c => c.chain_id === chain_id)?.provider_params,
          })
        } catch (error) {}
      }
    }

    if (contract) {
      setAddTokenData({ chain_id, contract })
    }
  }

  const chain = chains_data?.find(c => c?.id === blockchain_id)
  if (blockchain_id && chains_data && !chain) {
    router.push('/')
  }
  const hasLiquidity = routers_assets_data?.findIndex(ra => ra?.asset_balances?.findIndex(ab => ab?.chain?.chain_id === chain?.chain_id) > -1) > -1

  const timeData = timesData?.find(t => t?.time === timeSelect) || _.last(timesData)

  return (
    <>
      <div className="max-w-8xl space-y-4 sm:space-y-8 my-2 xl:mt-4 xl:mb-6 mx-auto">
        <div className="flex items-center">
          <div className="flex items-center space-x-1">
            {['assets', 'routers'].map((a, i) => (
              <div
                key={i}
                onClick={() => setAssetBy(a)}
                className={`btn btn-lg btn-rounded cursor-pointer bg-trasparent ${a === assetBy ? 'bg-gray-100 dark:bg-gray-900 font-semibold' : 'hover:bg-gray-100 dark:hover:bg-gray-900 text-gray-400 hover:text-black dark:text-gray-600 dark:hover:text-white'}`}
              >
                {a}
              </div>
            ))}
          </div>
          {hasLiquidity && (
            <div className="text-right space-y-1 ml-auto">
              <div className="whitespace-nowrap uppercase text-gray-400 dark:text-gray-600 font-medium">Available Liquidity</div>
              <div className="font-mono font-semibold">
                {currency_symbol}{numberFormat(_.sumBy(routers_assets_data.flatMap(ra => ra?.asset_balances?.filter(ab => ab?.chain?.chain_id === chain?.chain_id) || []), 'amount_value'), '0,0')}
              </div>
            </div>
          )}
        </div>
        <Assets assetBy={assetBy} addTokenToMetaMaskFunction={addTokenToMetaMask} />
        <div className="mx-auto">
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
                      {numberFormat(blockchain_id ? timeData.totalTxCount : timeData.receivingTxCount, '0,0')}
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
        </div>
        <div className="mx-auto">
          <Transactions addTokenToMetaMaskFunction={addTokenToMetaMask} className="no-border" />
        </div>
      </div>
    </>
  )
}