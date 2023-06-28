import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { TailSpin } from 'react-loader-spinner'

import Copy from '../copy'
import Datatable from '../datatable'
import DecimalsFormat from '../decimals-format'
import EnsProfile from '../ens-profile'
import Image from '../image'
import { ProgressBar } from '../progress-bars'

import { currency_symbol } from '../../lib/object/currency'
import { toArray, ellipse, loaderColor } from '../../lib/utils'

export default ({ data }) => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  return (
    <div className="space-y-4">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="whitespace-nowrap uppercase text-sm font-semibold">
          Routers
        </div>
      </div>
      {data ?
        <Datatable
          columns={[
            {
              Header: '#',
              accessor: 'i',
              sortType: (a, b) => a.original.i > b.original.i ? 1 : -1,
              Cell: props => (
                <span className="font-semibold">
                  {(props.flatRows?.indexOf(props.row) > -1 ? props.flatRows.indexOf(props.row) : props.value) + 1}
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
                        fallback={
                          <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                            <span className="xl:hidden">
                              {ellipse(value, 8)}
                            </span>
                            <span className="hidden xl:block">
                              {ellipse(value, 12)}
                            </span>
                          </span>
                        }
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
                    {toArray(value).filter(v => v.asset_data?.symbol).map((v, i) => {
                      const { asset_data, amount, value } = { ...v }
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
                                <DecimalsFormat
                                  value={amount}
                                  noTooltip={true}
                                  className="uppercase text-2xs font-semibold"
                                />
                              </div>
                              <div className="h-4 flex items-center space-x-1">
                                <span className="text-slate-400 dark:text-slate-500 text-2xs font-medium">
                                  Liquidity:
                                </span>
                                <DecimalsFormat
                                  value={value}
                                  prefix={currency_symbol}
                                  noTooltip={true}
                                  className="uppercase text-2xs font-semibold"
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
              headerClassName: 'min-w-max whitespace-nowrap justify-start',
            },
            {
              Header: 'Liquidity',
              accessor: 'total_value',
              sortType: (a, b) => a.original.total_value > b.original.total_value ? 1 : -1,
              Cell: props => {
                const { value } = { ...props }
                return (
                  <div className="text-base font-bold text-right">
                    {typeof value === 'number' ?
                      <DecimalsFormat
                        value={value}
                        prefix={currency_symbol}
                        noTooltip={true}
                        className="uppercase"
                      /> :
                      <span className="text-slate-400 dark:text-slate-500">-</span>
                    }
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'Relative Share %',
              accessor: 'share',
              sortType: (a, b) => a.original.total_value > b.original.total_value ? 1 : -1,
              Cell: props => {
                const { flatRows, row } = { ...props }
                const index = flatRows?.indexOf(row)
                const total = _.sumBy(data, 'total_value')

                const _data =
                  index > -1 ?
                    _.slice(
                      flatRows.map(d => {
                        const { original } = { ...d }
                        const { total_value } = { ...original }
                        return {
                          ...original,
                          value_share: total_value * 100 / total,
                        }
                      }),
                      0,
                      index + 1,
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
                    <DecimalsFormat
                      value={total_share}
                      format="0,0.0"
                      suffix="%"
                      noTooltip={true}
                      className="text-slate-600 dark:text-slate-200 text-2xs font-medium"
                    />
                  </div>
                )
              },
              headerClassName: 'whitespace-nowrap justify-start',
            },
          ]}
          data={data}
          noPagination={data.length <= 10}
          defaultPageSize={50}
          className="no-border"
        /> :
        <div className="flex items-center my-3">
          <TailSpin
            width="32"
            height="32"
            color={loaderColor(theme)}
          />
        </div>
      }
    </div>
  )
}