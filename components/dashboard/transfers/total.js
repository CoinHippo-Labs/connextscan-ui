import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'

import Image from '../../image'
import { number_format, loader_color } from '../../../lib/utils'

export default ({ data }) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const {
    total_transfers,
    top_chains_by_transfers,
  } = { ...data }

  return (
    <div className="h-80 bg-white dark:bg-black border border-slate-100 dark:border-slate-800 shadow dark:shadow-slate-400 rounded-lg space-y-0.5 p-5">
      {data ?
        <div className="space-y-4">
          <div className="text-center py-6">
            <div className="space-y-2 pt-6 pb-3">
              <div className="uppercase text-4xl font-extrabold">
                {number_format(total_transfers, total_transfers > 10000000 ? '0,0.00a' : '0,0')}
              </div>
              <div className="flex items-center justify-center space-x-2">
                <span className="text-slate-400 dark:text-white text-base font-bold">
                  Total Transfers
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
                Transfers
              </span>
            </div>
            {top_chains_by_transfers?.map((c, i) => (
              <div
                key={i}
                className="flex items-center justify-between space-x-2"
              >
                <div>
                  {c?.chain_data && (
                    <Link href={`/${c.chain_data.id}`}>
                      <a className="flex items-center space-x-1">
                        {c.chain_data.image && (
                          <Image
                            src={c.chain_data.image}
                            alt=""
                            title={c.chain_data.name}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        )}
                        <span className="font-semibold">
                          {c.chain_data.name}
                        </span>
                      </a>
                    </Link>
                  )}
                </div>
                <span className="uppercase font-bold">
                  {number_format(c.transfers, c.transfers > 100000 ? '0,0.00a' : '0,0')}
                </span>
              </div>
            ))}
          </div>
        </div>
        :
        <div className="h-full flex items-center justify-center">
          <TailSpin color={loader_color(theme)} width="40" height="40" strokeWidth="8" />
        </div>
      }
    </div>
  )
}