import { useSelector, shallowEqual } from 'react-redux'
import { TailSpin } from 'react-loader-spinner'

import Image from '../image'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, loader_color } from '../../lib/utils'

export default ({
  data,
}) => {
  const {
    preferences,
    chains,
  } = useSelector(state =>
    (
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

  const metricClassName = 'bg-white dark:bg-black border dark:border-slate-900 shadow dark:shadow-slate-400 rounded-lg space-y-0.5 py-3 px-4'
  const titleClassName = 'text-slate-400 dark:text-slate-200 text-base font-medium'

  return (
    <div className={`w-full grid grid-flow-row sm:grid-cols-2 lg:grid-cols-${(supported_chains ? 4 : 3) + (typeof fee === 'number' ? 1 : 0)} gap-5`}>
      <div className={`${metricClassName}`}>
        <span className={titleClassName}>
          Liquidity
        </span>
        <div className="uppercase text-3xl font-bold">
          {data ?
            `${currency_symbol}${number_format(
              liquidity,
              liquidity > 1000000 ?
                '0,0.00a' :
                liquidity > 10000 ?
                  '0,0' :
                  '0,0.00',
            )}` :
            <TailSpin
              color={loader_color(theme)}
              width="32"
              height="32"
            />
          }
        </div>
      </div>
      <div className={`${metricClassName}`}>
        <span className={titleClassName}>
          Volume
        </span>
        <div className="uppercase text-3xl font-bold">
          {data ?
            `${currency_symbol}${number_format(
              volume,
              '0,0',
            )}` :
            <TailSpin
              color={loader_color(theme)}
              width="32"
              height="32"
            />
          }
        </div>
      </div>
      <div className={`${metricClassName}`}>
        <span className={titleClassName}>
          Transfers
        </span>
        <div className="uppercase text-3xl font-bold">
          {data ?
            number_format(
              transfers,
              '0,0',
            ) :
            <TailSpin
              color={loader_color(theme)}
              width="32"
              height="32"
            />
          }
        </div>
      </div>
      {
        typeof fee === 'number' &&
        (
          <div className={`${metricClassName}`}>
            <span className={titleClassName}>
              Fee
            </span>
            <div className="uppercase text-3xl font-bold">
              {data ?
                `${currency_symbol}${number_format(
                  fee,
                  '0,0',
                )}` :
                <TailSpin
                  color={loader_color(theme)}
                  width="32"
                  height="32"
                />
              }
            </div>
          </div>
        )
      }
      {
        supported_chains &&
        (
          <div className={`${metricClassName}`}>
            <span className={titleClassName}>
              Supported Chains
            </span>
            <div className="uppercase text-3xl font-bold">
              {data ?
                <div className="flex items-center mt-1">
                  {supported_chains
                    .map((id, i) => {
                      const {
                        name,
                        image,
                      } = { ...chains_data?.find(c => c?.chain_id === id) }

                      return image &&
                        (
                          <div
                            key={i}
                            title={name}
                            className="mr-1"
                          >
                            <Image
                              src={image}
                              alt=""
                              width={24}
                              height={24}
                              className="rounded-full"
                            />
                          </div>
                        )
                    })
                    .filter(c => c)
                  }
                </div> :
                <TailSpin
                  color={loader_color(theme)}
                  width="32"
                  height="32"
                />
              }
            </div>
          </div>
        )
      }
    </div>
  )
}