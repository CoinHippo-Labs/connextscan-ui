import Link from 'next/link'
import _ from 'lodash'

import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import Copy from '../copy'
import Image from '../image'
import EnsProfile from '../profile/ens'
import { ProgressBar } from '../progress-bars'

import { isNumber } from '../../lib/number'
import { toArray } from '../../lib/utils'

export default ({ data }) => {
  return (
    <div className="space-y-4">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="whitespace-nowrap uppercase text-sm font-bold">
          Routers
        </div>
      </div>
      {data ?
        <Datatable
          columns={[
            {
              Header: '#',
              accessor: 'i',
              disableSortBy: true,
              Cell: props => (
                <span className="text-black dark:text-white font-medium">
                  {props.flatRows?.indexOf(props.row) + 1}
                </span>
              ),
            },
            {
              Header: 'Address',
              accessor: 'router_address',
              disableSortBy: true,
              Cell: props => {
                const { value } = { ...props }
                return value && (
                  <div className="flex items-center space-x-1">
                    <Link href={`/router/${value}`}>
                      <EnsProfile
                        address={value}
                        noCopy={true}
                        noImage={true}
                      />
                    </Link>
                    <Copy value={value} />
                  </div>
                )
              },
            },
            {
              Header: 'By Asset',
              accessor: 'assets',
              sortType: (a, b) => a.original.total_value > b.original.total_value ? 1 : -1,
              Cell: props => {
                const { value } = { ...props }
                return (
                  <div className="min-w-max grid grid-cols-2 gap-2">
                    {toArray(value).filter(d => d.asset_data?.symbol).map((d, i) => {
                      const { asset_data, amount, value } = { ...d }
                      const { symbol, image } = { ...asset_data }
                      return (
                        <div key={i} className="flex items-start space-x-2 mt-0.5">
                          <Image
                            src={image}
                            width={18}
                            height={18}
                            className="rounded-full"
                          />
                          <div className="flex flex-col space-y-0.5">
                            <span className="text-xs font-semibold">
                              {symbol}
                            </span>
                            <div className="flex flex-col">
                              <div className="h-4 flex items-center space-x-1">
                                <span className="text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                  Amount:
                                </span>
                                <NumberDisplay
                                  value={amount}
                                  noTooltip={true}
                                  className="text-2xs font-semibold"
                                />
                              </div>
                              <div className="h-4 flex items-center space-x-1">
                                <span className="text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                  Liquidity:
                                </span>
                                <NumberDisplay
                                  value={value}
                                  prefix="$"
                                  noTooltip={true}
                                  className="text-2xs font-semibold"
                                />
                              </div>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )
              },
              headerClassName: 'w-64 whitespace-nowrap',
            },
            {
              Header: 'Liquidity',
              accessor: 'total_value',
              sortType: (a, b) => a.original.total_value > b.original.total_value ? 1 : -1,
              Cell: props => {
                const { value } = { ...props }
                return (
                  <div className="text-right">
                    {isNumber(value) ?
                      <NumberDisplay
                        value={value}
                        prefix="$"
                        noTooltip={true}
                        className="text-base font-bold"
                      /> :
                      <span className="text-slate-400 dark:text-slate-500">
                        -
                      </span>
                    }
                  </div>
                )
              },
              headerClassName: 'justify-end whitespace-nowrap text-right',
            },
            {
              Header: 'Relative Share %',
              accessor: 'share',
              sortType: (a, b) => a.original.total_value > b.original.total_value ? 1 : -1,
              Cell: props => {
                const { flatRows, row } = { ...props }
                const index = flatRows?.indexOf(row)
                const total = _.sumBy(data, 'total_value')
                const _data = index > -1 ?
                  _.slice(
                    flatRows.map(d => {
                      const { original } = { ...d }
                      const { total_value } = { ...original }
                      return { ...original, value_share: (total_value > 0 ? total_value : 0) * 100 / total }
                    }),
                    0, index + 1,
                  ) :
                  []
                const { value_share } = { ..._.last(_data) }
                const total_share = value_share // _.sumBy(_data, 'value_share')
                return (
                  <div className="flex items-start space-x-1.5 mt-0.5">
                    <div className="w-20 bg-zinc-200 dark:bg-zinc-800 mt-0.5">
                      <div style={{ width: `${total_share}%` }}>
                        <ProgressBar
                          width={(total_share - value_share) * 100 / total_share}
                          color="bg-blue-200"
                          backgroundClassName="h-7 bg-blue-500"
                          className="h-7"
                        />
                      </div>
                    </div>
                    <NumberDisplay
                      value={total_share}
                      format="0,0.0"
                      suffix="%"
                      noTooltip={true}
                      className="text-slate-600 dark:text-slate-200 text-2xs font-medium"
                    />
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap',
            },
          ]}
          data={data}
          defaultPageSize={50}
          noPagination={data.length <= 10}
          className="no-border no-shadow"
        /> :
        <div className="loading">
          <Spinner width={32} height={32} />
        </div>
      }
    </div>
  )
}