import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { BigNumber, utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'

import Image from '../image'
import Datatable from '../datatable'
import Copy from '../copy'
import EnsProfile from '../ens-profile'

import { currency_symbol } from '../../lib/object/currency'
import { number_format, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, asset_balances } = useSelector(state => ({ preferences: state.preferences, asset_balances: state.asset_balances }), shallowEqual)
  const { theme } = { ...preferences }
  const { asset_balances_data } = { ...asset_balances }

  const routers = _.orderBy(Object.entries(_.groupBy(Object.values({ ...asset_balances_data }).flatMap(a => a), 'router_address')).map(([k, v]) => {
    return {
      router_address: k,
      assets: _.orderBy(v?.map(a => {
        const asset_data = a?.asset_data
        const decimals = asset_data?.contract_decimals || 18
        const price = asset_data?.price || 0
        const liquidity = a?.balance
        const amount = Number(utils.formatUnits(BigInt(liquidity || 0).toString(), decimals))
        const value = typeof amount === 'number' ? amount * price : null
        return {
          ...a,
          amount,
          value,
        }
      }) || [], ['value'], ['desc']),
    }
  }).map(r => {
    return {
      ...r,
      total_value: _.sumBy(r.assets, 'value'),
      total_transfers: 1000,
      total_volume: 10000000,
      total_fee: 33.33,
      supported_chains: _.uniqBy(r.assets?.map(a => a?.chain_data), 'id'),
    }
  }), ['total_value'], ['desc'])

  return asset_balances_data ?
    <div className="grid my-4 sm:my-6">
      <Datatable
        columns={[
          {
            Header: '#',
            accessor: 'i',
            sortType: (a, b) => a.original.i > b.original.i ? 1 : -1,
            Cell: props => (
              <span className="font-mono font-semibold">
                {number_format((props.flatRows?.indexOf(props.row) > -1 ?
                  props.flatRows.indexOf(props.row) : props.value
                ) + 1, '0,0')}
              </span>
            ),
          },
          {
            Header: 'Address',
            accessor: 'router_address',
            disableSortBy: true,
            Cell: props => (
              <div className="flex items-center space-x-1">
                <Link href={`/router/${props.value}`}>
                  <a>
                    <EnsProfile
                      address={props.value}
                      no_copy={true}
                      fallback={props.value && (
                        <span className="text-slate-400 dark:text-slate-200 text-sm font-semibold">
                          <span className="xl:hidden">
                            {ellipse(props.value, 8)}
                          </span>
                          <span className="hidden xl:block">
                            {ellipse(props.value, 12)}
                          </span>
                        </span>
                      )}
                    />
                  </a>
                </Link>
                {props.value && (
                  <Copy
                    value={props.value}
                    size={18}
                  />
                )}
              </div>
            ),
          },
          {
            Header: 'Liquidity',
            accessor: 'total_value',
            sortType: (a, b) => a.original.total_value > b.original.total_value ? 1 : -1,
            Cell: props => (
              <div className="text-base font-bold text-right">
                {typeof props.value === 'number' ?
                  <span className="uppercase">
                    {currency_symbol}
                    {number_format(props.value, props.value > 1000000 ? '0,0.00a' : props.value > 10000 ? '0,0' : '0,0.00')}
                  </span>
                  :
                  <span className="text-slate-400 dark:text-slate-500">
                    n/a
                  </span>
                }
              </div>
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: 'Transfers',
            accessor: 'total_transfers',
            sortType: (a, b) => a.original.total_transfers > b.original.total_transfers ? 1 : -1,
            Cell: props => (
              <div className="text-base font-bold text-right">
                {typeof props.value === 'number' ?
                  <span className="uppercase">
                    {number_format(props.value, props.value > 100000 ? '0,0.00a' : '0,0')}
                  </span>
                  :
                  <span className="text-slate-400 dark:text-slate-500">
                    n/a
                  </span>
                }
              </div>
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: 'Volume',
            accessor: 'total_volume',
            sortType: (a, b) => a.original.total_volume > b.original.total_volume ? 1 : -1,
            Cell: props => (
              <div className="text-base font-bold text-right">
                {typeof props.value === 'number' ?
                  <span className="uppercase">
                    {currency_symbol}
                    {number_format(props.value, props.value > 10000000 ? '0,0.00a' : props.value > 100000 ? '0,0' : '0,0.00')}
                  </span>
                  :
                  <span className="text-slate-400 dark:text-slate-500">
                    n/a
                  </span>
                }
              </div>
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: 'Fee',
            accessor: 'total_fee',
            sortType: (a, b) => a.original.total_fee > b.original.total_fee ? 1 : -1,
            Cell: props => (
              <div className="text-base font-bold text-right">
                {typeof props.value === 'number' ?
                  <span className="uppercase">
                    {currency_symbol}
                    {number_format(props.value, props.value > 100000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
                  </span>
                  :
                  <span className="text-slate-400 dark:text-slate-500">
                    n/a
                  </span>
                }
              </div>
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
          {
            Header: 'Supported Chains',
            accessor: 'supported_chains',
            sortType: (a, b) => a.original.supported_chains?.length > b.original.supported_chains?.length ? 1 : -1,
            Cell: props => (
              <div className={`xl:w-${props.value?.length > 5 ? '56' : '32'} flex flex-wrap items-center justify-end ml-auto`}>
                {props.value?.length > 0 ?
                  props.value.map((c, i) => (
                    <div
                      key={i}
                      title={c?.name}
                      className="mb-1.5 ml-1.5"
                    >
                      {c?.image && (
                        <Image
                          src={c.image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                    </div>
                  ))
                  :
                  <span className="text-slate-400 dark:text-slate-500">
                    No chains supported
                  </span>
                }
              </div>
            ),
            headerClassName: 'whitespace-nowrap justify-end text-right',
          },
        ]}
        data={routers}
        noPagination={routers.length <= 10}
        defaultPageSize={50}
        className="no-border"
      />
    </div>
    :
    <div className="h-32 flex items-center justify-center my-4 sm:my-6">
      <TailSpin color={loader_color(theme)} width="32" height="32" />
    </div>
}