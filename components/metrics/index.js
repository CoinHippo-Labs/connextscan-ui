import { useSelector, shallowEqual } from 'react-redux'
import { TailSpin } from 'react-loader-spinner'

import DecimalsFormat from '../decimals-format'
import Image from '../image'
import { currency_symbol } from '../../lib/object/currency'
import { getChain } from '../../lib/object/chain'
import { numberFormat, toArray, loaderColor } from '../../lib/utils'

export default (
  {
    data,
  },
) => {
  const {
    preferences,
    chains,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }

  const {
    liquidity,
    volume,
    transfers,
    fee,
    supported_chains,
  } = { ...data }

  const metricClassName = 'bg-slate-50 dark:bg-slate-900 dark:bg-opacity-75 border dark:border-slate-900 rounded-lg space-y-0.5 py-3 px-4'
  const titleClassName = 'text-slate-400 dark:text-slate-200 text-base font-medium'
  const valueClassName = 'uppercase text-3xl font-bold'

  return (
    <div className={`w-full grid grid-flow-row sm:grid-cols-2 lg:grid-cols-${3 + (transfers ? 1 : 0) + (typeof fee === 'number' ? 1 : 0)} gap-5`}>
      <div className={metricClassName}>
        <span className={titleClassName}>
          Liquidity
        </span>
        <div>
          {data ?
            <DecimalsFormat
              value={liquidity > 1000000 ? numberFormat(liquidity, '0,0.00a') : liquidity}
              prefix={currency_symbol}
              className={valueClassName}
            /> :
            <TailSpin
              width="32"
              height="32"
              color={loaderColor(theme)}
            />
          }
        </div>
      </div>
      <div className={metricClassName}>
        <span className={titleClassName}>
          Volume
        </span>
        <div>
          {data ?
            <DecimalsFormat
              value={volume > 1000000 ? numberFormat(volume, '0,0.00a') : volume}
              prefix={currency_symbol}
              className={valueClassName}
            /> :
            <TailSpin
              width="32"
              height="32"
              color={loaderColor(theme)}
            />
          }
        </div>
      </div>
      {
        transfers > 0 &&
        (
          <div className={metricClassName}>
            <span className={titleClassName}>
              Transfers
            </span>
            <div>
              {data ?
                <DecimalsFormat
                  value={transfers}
                  className={valueClassName}
                /> :
                <TailSpin
                  width="32"
                  height="32"
                  color={loaderColor(theme)}
                />
              }
            </div>
          </div>
        )
      }
      {
        typeof fee === 'number' &&
        (
          <div className={metricClassName}>
            <span className={titleClassName}>
              Fee
            </span>
            <div>
              {data ?
                <DecimalsFormat
                  value={fee}
                  prefix={currency_symbol}
                  className={valueClassName}
                /> :
                <TailSpin
                  width="32"
                  height="32"
                  color={loaderColor(theme)}
                />
              }
            </div>
          </div>
        )
      }
      <div className={metricClassName}>
        <span className={titleClassName}>
          Supported Chains
        </span>
        <div className={valueClassName}>
          {data ?
            <div className="flex items-center mt-1">
              {toArray(supported_chains)
                .map((id, i) => {
                  const {
                    name,
                    image,
                  } = { ...getChain(id, chains_data) }

                  return (
                    image &&
                    (
                      <div
                        key={i}
                        title={name}
                        className="mr-1"
                      >
                        <Image
                          src={image}
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      </div>
                    )
                  )
                })
                .filter(c => c)
              }
            </div> :
            <TailSpin
              width="32"
              height="32"
              color={loaderColor(theme)}
            />
          }
        </div>
      </div>
    </div>
  )
}