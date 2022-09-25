import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'

import Image from '../../image'
import { currency_symbol } from '../../../lib/object/currency'
import { number_format, loader_color } from '../../../lib/utils'

export default ({
  data,
}) => {
  const {
    preferences,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }

  const {
    total_fee,
    top_chains_by_fee,
  } = { ...data }

  return (
    <div className="h-80 bg-white dark:bg-black border border-slate-100 dark:border-slate-800 shadow dark:shadow-slate-400 rounded-lg space-y-0.5 p-5">
      {data ?
        <div className="space-y-4">
          <div className="text-center py-6">
            <div className="space-y-2 pt-6 pb-3">
              <div className="uppercase text-4xl font-extrabold">
                {currency_symbol}
                {number_format(
                  total_fee,
                  total_fee > 100000 ?
                    '0,0.00a' :
                    total_fee > 10000 ?
                      '0,0' :
                      '0,0.00',
                )}
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-slate-400 dark:text-white text-base font-bold">
                  Total Fee
                </span>
              </div>
            </div>
          </div>
          <div className="space-y-2">
            <div className="flex items-center justify-between space-x-2">
              <span className="uppercase text-slate-400 dark:text-slate-200 font-bold">
                Top 3 destination
              </span>
              <span className="uppercase text-slate-400 dark:text-slate-200 font-bold">
                Fee
              </span>
            </div>
            {(top_chains_by_fee || [])
              .map((c, i) => {
                const {
                  chain_data,
                  fee,
                } = { ...c }
                const {
                  id,
                  name,
                  image,
                } = { ...chain_data }

                return (
                  <div
                    key={i}
                    className="flex items-center justify-between space-x-2"
                  >
                    {
                      chain_data &&
                      (
                        <Link href={`/${id}`}>
                          <a className="flex items-center space-x-1">
                            {
                              image &&
                              (
                                <Image
                                  src={image}
                                  alt=""
                                  title={name}
                                  width={20}
                                  height={20}
                                  className="rounded-full"
                                />
                              )
                            }
                            <span className="font-semibold">
                              {name}
                            </span>
                          </a>
                        </Link>
                      )
                    }
                    <span className="uppercase font-bold">
                      {currency_symbol}
                      {number_format(
                        fee,
                        fee > 10000 ?
                          '0,0.00a' :
                          fee > 1000 ?
                            '0,0' :
                            '0,0.00',
                      )}
                    </span>
                  </div>
                )
              })
            }
          </div>
        </div> :
        <div className="h-full flex items-center justify-center">
          <TailSpin
            color={loader_color(theme)}
            width="40"
            height="40"
            strokeWidth="8"
          />
        </div>
      }
    </div>
  )
}