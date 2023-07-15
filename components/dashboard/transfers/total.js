import Link from 'next/link'

import Spinner from '../../spinner'
import NumberDisplay from '../../number'
import Image from '../../image'
import { toArray } from '../../../lib/utils'

export default ({ data }) => {
  const { total_transfers, top_chains_by_transfers } = { ...data }
  return (
    <div className="h-80 bg-slate-50 dark:bg-slate-900 dark:bg-opacity-75 rounded p-5">
      {data ?
        <div className="space-y-4">
          <div className="text-center py-6">
            <div className="space-y-2 pt-6 pb-3">
              <NumberDisplay value={total_transfers} className="text-4xl font-extrabold" />
              <div className="flex items-center justify-center">
                <span className="text-slate-600 dark:text-white text-base font-bold">
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
            {toArray(top_chains_by_transfers).map((d, i) => {
              const { chain_data, transfers } = { ...d }
              const { id, name, image } = { ...chain_data }
              return (
                <div key={i} className="flex items-center justify-between space-x-2">
                  {chain_data && (
                    <Link href={`/${id}`}>
                      <div className="flex items-center space-x-1">
                        {image && (
                          <Image
                            src={image}
                            width={20}
                            height={20}
                            className="rounded-full"
                          />
                        )}
                        <span className="font-semibold">
                          {name}
                        </span>
                      </div>
                    </Link>
                  )}
                  <NumberDisplay value={transfers} className="font-bold" />
                </div>
              )
            })}
          </div>
        </div> :
        <div className="h-full flex items-center justify-center">
          <Spinner width={40} height={40} />
        </div>
      }
    </div>
  )
}