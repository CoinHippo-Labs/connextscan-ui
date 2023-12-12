import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'

import Spinner from '../spinner'
import NumberDisplay from '../number'
import Image from '../image'
import { NUM_STATS_DAYS } from '../../lib/config'
import { getChainData } from '../../lib/object'
import { isNumber } from '../../lib/number'
import { toArray } from '../../lib/utils'

export default ({ data, numDays = NUM_STATS_DAYS }) => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const router = useRouter()
  const { query } = { ...router }
  const { chain } = { ...query }

  const { liquidity, volume, transfers, supported_chains } = { ...data }
  const metricClassName = 'bg-slate-50 dark:bg-slate-900 dark:bg-opacity-75 border dark:border-slate-900 rounded-lg space-y-0.5 py-3 px-4'
  const titleClassName = 'text-slate-400 dark:text-slate-200 text-base font-medium'
  const valueClassName = 'text-3xl font-bold'

  return (
    <div className={`w-full grid grid-flow-row sm:grid-cols-2 lg:grid-cols-${2 + (transfers ? 1 : 0) + (chain ? 0 : 1)} gap-5`}>
      <div className={metricClassName}>
        <span className={titleClassName}>
          Liquidity
        </span>
        <div>
          {data ?
            <NumberDisplay
              value={liquidity}
              format="0,0.00a"
              prefix="$"
              noTooltip={true}
              className={valueClassName}
            /> :
            <Spinner width={32} height={32} />
          }
        </div>
      </div>
      <div className={metricClassName}>
        <span className={titleClassName}>
          Volume{numDays ? ` ${numDays}D` : ''}
        </span>
        <div>
          {data && typeof volume === 'number' ?
            <NumberDisplay
              value={volume}
              format="0,0.00a"
              prefix="$"
              noTooltip={true}
              className={valueClassName}
            /> :
            <Spinner width={32} height={32} />
          }
        </div>
      </div>
      {transfers > 0 && (
        <div className={metricClassName}>
          <span className={titleClassName}>
            Transfers
          </span>
          <div>
            {data ?
              <NumberDisplay value={transfers} className={valueClassName} /> :
              <Spinner width={32} height={32} />
            }
          </div>
        </div>
      )}
      {!chain && (
        <div className={metricClassName}>
          <span className={titleClassName}>
            Supported Chains
          </span>
          <div className={valueClassName}>
            {data ?
              <div className="flex items-center mt-1">
                {toArray(toArray(supported_chains).map((id, i) => {
                  const { name, image } = { ...getChainData(id, chains_data) }
                  return image && (
                    <div key={i} title={name} className="mr-1">
                      <Image
                        src={image}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    </div>
                  )
                }))}
              </div> :
              <Spinner width={32} height={32} />
            }
          </div>
        </div>
      )}
    </div>
  )
}