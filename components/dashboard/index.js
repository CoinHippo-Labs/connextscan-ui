import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'

import TvlTotal from './tvl/total'
import Tvl from './tvl'
import SelectTimeframe from '../select/timeframe'
import VolumeTotal from './volume/total'
import Volume from './volume'
import TransfersTotal from './transfers/total'
import Transfers from './transfers'
import FeeTotal from './fee/total'
import Fee from './fee'
import { timeframes } from '../../lib/object/timeframe'

export default () => {
  const { chains, dev } = useSelector(state => ({ chains: state.chains, dev: state.dev }), shallowEqual)
  const { chains_data } = { ...chains }
  const { sdk } = { ...dev }

  const [timeframe, setTimeframe] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    if (sdk) {
      const _timeframe = timeframes.find(t => t?.day === timeframe)
      setData({
        total_volume: 100000000,
        top_chains_by_volume: _.slice(chains_data.map(c => {
          return {
            chain_data: c,
            volume: 10000,
          }
        }), 0, 3),
        volumes: [...Array(timeframe || 30).keys()].map(i => {
          return {
            timestamp: moment().subtract((timeframe || 30) - i, _timeframe?.timeframe).startOf(_timeframe?.timeframe).valueOf(),
            volume: 1000000 * Math.ceil(Math.random(0, 1) * 10) / Math.ceil(Math.random(0, 1) * 100),
          }
        }),
        total_transfers: 10000,
        top_chains_by_transfers: _.slice(chains_data.map(c => {
          return {
            chain_data: c,
            transfers: 1000,
          }
        }), 0, 3),
        transfers: [...Array(timeframe || 30).keys()].map(i => {
          return {
            timestamp: moment().subtract((timeframe || 30) - i, _timeframe?.timeframe).startOf(_timeframe?.timeframe).valueOf(),
            transfers: 10000 * Math.ceil(Math.random(0, 1) * 10) / Math.ceil(Math.random(0, 1) * 100),
          }
        }),
        total_fee: 10000,
        top_chains_by_fee: _.slice(chains_data.map(c => {
          return {
            chain_data: c,
            fee: 1000,
          }
        }), 0, 3),
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
      <VolumeTotal data={data} />
      <div className="lg:col-span-3">
        <Volume
          timeframe={timeframe}
          volumes={volumes}
        />
      </div>
      <TransfersTotal data={data} />
      <div className="lg:col-span-3">
        <Transfers
          timeframe={timeframe}
          transfers={transfers}
        />
      </div>
      <FeeTotal data={data} />
      <div className="lg:col-span-3">
        <Fee
          timeframe={timeframe}
          fees={fees}
        />
      </div>
    </div>
  )
}