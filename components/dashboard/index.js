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
          const volume_by_chains = _.orderBy(chains_data.map(c => {
            const {
              id,
              color,
            } = { ...c }
            return {
              id,
              color,
              chain_data: c,
              volume: 100000 * Math.ceil(Math.random(0, 1) * 10) / Math.ceil(Math.random(0, 1) * 100),
            }
          }), ['volume'], ['desc'])
          return {
            timestamp: moment().subtract((timeframe || 30) - i, _timeframe?.timeframe).startOf(_timeframe?.timeframe).valueOf(),
            volume: _.sumBy(volume_by_chains, 'volume'),
            volume_by_chains,
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
          const transfers_by_chains = _.orderBy(chains_data.map(c => {
            const {
              id,
              color,
            } = { ...c }
            return {
              id,
              color,
              chain_data: c,
              transfers: 1000 * Math.ceil(Math.random(0, 1) * 10) / Math.ceil(Math.random(0, 1) * 100),
            }
          }), ['transfers'], ['desc'])
          return {
            timestamp: moment().subtract((timeframe || 30) - i, _timeframe?.timeframe).startOf(_timeframe?.timeframe).valueOf(),
            transfers: _.sumBy(transfers_by_chains, 'transfers'),
            transfers_by_chains,
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
          const fee_by_chains = _.orderBy(chains_data.map(c => {
            const {
              id,
              color,
            } = { ...c }
            return {
              id,
              color,
              chain_data: c,
              fee: 10 * Math.ceil(Math.random(0, 1) * 10) / Math.ceil(Math.random(0, 1) * 100),
            }
          }), ['fee'], ['desc'])
          return {
            timestamp: moment().subtract((timeframe || 30) - i, _timeframe?.timeframe).startOf(_timeframe?.timeframe).valueOf(),
            fee: _.sumBy(fee_by_chains, 'fee'),
            fee_by_chains,
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
      <FeeTotal data={data} />
      <div className="lg:col-span-3">
        <Fee
          timeframe={timeframe}
          stacked={true}
          fees={fees}
        />
      </div>
    </div>
  )
}