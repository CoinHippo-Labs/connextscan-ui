import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'

import Metrics from '../metrics'
import SelectTimeframe from '../select/timeframe'
import Volume from '../dashboard/volume'
import Transfers from '../dashboard/transfers'
import Fee from '../dashboard/fee'
import Assets from '../assets'
import { timeframes } from '../../lib/object/timeframe'
import { equals_ignore_case } from '../../lib/utils'

export default () => {
  const { chains, dev } = useSelector(state => ({ chains: state.chains, dev: state.dev }), shallowEqual)
  const { chains_data } = { ...chains }
  const { sdk } = { ...dev }

  const router = useRouter()
  const { query } = { ...router }
  const { chain } = { ...query }

  const [liquidity, setLiquidity] = useState(null)
  const [timeframe, setTimeframe] = useState(null)
  const [statsData, setStatsData] = useState(null)

  useEffect(() => {
    if (chain && chains_data && sdk) {
      const getData = async is_interval => {
        const response = await sdk.nxtpSdkUtils.getRoutersData()
        if (response || !is_interval) {
          const chain_data = chains_data?.find(c => c?.id === chain)
          const data = response?.filter(l => l?.domain === chain_data?.domain_id).map(l => {
            return {
              ...l,
              chain_id: chain_data?.chain_id,
              contract_address: l?.adopted,
              amount: BigInt(Number(l?.balance) || 0).toString(),
            }
          }) || []
          setLiquidity(data)
        }
      }
      getData()
      const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
      return () => {
        clearInterval(interval)
      }
    }
  }, [chain, chains_data, sdk])

  useEffect(() => {
    if (sdk) {
      const _timeframe = timeframes.find(t => t?.day === timeframe)
      setStatsData({
        volumes: [...Array(timeframe || 30).keys()].map(i => {
          return {
            timestamp: moment().subtract((timeframe || 30) - i, _timeframe?.timeframe).startOf(_timeframe?.timeframe).valueOf(),
            volume: 1000000 * Math.ceil(Math.random(0, 1) * 10) / Math.ceil(Math.random(0, 1) * 100),
          }
        }),
        transfers: [...Array(timeframe || 30).keys()].map(i => {
          return {
            timestamp: moment().subtract((timeframe || 30) - i, _timeframe?.timeframe).startOf(_timeframe?.timeframe).valueOf(),
            transfers: 10000 * Math.ceil(Math.random(0, 1) * 10) / Math.ceil(Math.random(0, 1) * 100),
          }
        }),
        fees: [...Array(timeframe || 30).keys()].map(i => {
          return {
            timestamp: moment().subtract((timeframe || 30) - i, _timeframe?.timeframe).startOf(_timeframe?.timeframe).valueOf(),
            fee: 100 * Math.ceil(Math.random(0, 1) * 10) / Math.ceil(Math.random(0, 1) * 100),
          }
        }),
      })
    }
  }, [sdk, timeframe])

  const {
    volumes,
    transfers,
    fees,
  } = { ...statsData }

  const metrics = liquidity && {
    liquidity: 1000000,
    volume: 10000000,
    transfers: 1000,
    fee: 33.33,
  }

  return (
    <>
      <div className="mb-6">
        <Metrics data={metrics} />
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
        <div className="lg:col-span-4">
          <Fee
            timeframe={timeframe}
            fees={fees}
          />
        </div>
      </div>
      <div className="flex items-start justify-between space-x-2">
        <div className="w-full grid grid-flow-row lg:grid-cols-2 gap-4 mb-4">
          <Assets data={liquidity} />
        </div>
      </div>
    </>
  )
}