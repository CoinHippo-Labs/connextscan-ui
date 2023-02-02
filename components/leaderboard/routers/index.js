import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { RiFileCodeLine } from 'react-icons/ri'

import Datatable from '../../datatable'
import Copy from '../../copy'
import Image from '../../image'
import { currency_symbol } from '../../../lib/object/currency'
import { numberFormat, ellipseAddress } from '../../../lib/utils'

export default function LeaderboardRouters({ className = '' }) {
  const { chains, ens, routers_status, routers_assets } = useSelector(state => ({ chains: state.chains, ens: state.ens, routers_status: state.routers_status, routers_assets: state.routers_assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { ens_data } = { ...ens }
  const { routers_status_data } = { ...routers_status }
  const { routers_assets_data } = { ...routers_assets }

  const router = useRouter()
  const { query } = { ...router }
  const { all } = { ...query }

  const [routers, setRouters] = useState(null)

  useEffect(() => {
    if (routers_status_data && routers_assets_data) {
      const data = routers_assets_data.map(ra => {
        return {
          ...ra,
          ...routers_status_data.find(r => r?.routerAddress?.toLowerCase() === ra?.router_id?.toLowerCase()),
        }
      }).map(ra => {
        return {
          ...ra,
          routerAddress: (ra?.routerAddress || ra?.router_id)?.toLowerCase(),
          trackerLength: typeof ra?.trackerLength === 'number' ? ra.trackerLength : -1,
          activeTransactionsLength: typeof ra?.activeTransactionsLength === 'number' ? ra.activeTransactionsLength : -1,
          supportedChains: ra?.supportedChains?.filter(id => chains_data?.findIndex(c => c?.chain_id === id) > -1),
        }
      }).map(ra => {
        const assetBalances = ra?.asset_balances || []

        return {
          ...ra,
          amount_value: _.sumBy(assetBalances, 'amount_value'),
          locked_value: _.sumBy(assetBalances, 'locked_value'),
          lockedIn_value: _.sumBy(assetBalances, 'lockedIn_value'),
          supplied_value: _.sumBy(assetBalances, 'supplied_value'),
          removed_value: _.sumBy(assetBalances, 'removed_value'),
          volume_value: _.sumBy(assetBalances, 'volume_value'),
          volumeIn_value: _.sumBy(assetBalances, 'volumeIn_value'),
          receivingFulfillTxCount: _.sumBy(assetBalances, 'receivingFulfillTxCount'),
        }
      }).filter(ra => ['true'].includes(all) || ra?.amount_value > 1)

      setRouters(_.orderBy(data, ['volume_value'], ['desc']))
    }
  }, [routers_status_data, routers_assets_data])

  const compareVersion = (v1, v2) => {
    if (!v1 || !v2) {
      if (v1) return 1
      return -1
    }
    else {
      v1 = v1.split('.').map(v => Number(v))
      v2 = v2.split('.').map(v => Number(v))
      for (let i = 0; i < v1.length; i++) {
        if (v1[i] > v2[i]) {
          return 1
        }
        else if (v1[i] < v2[i]) {
          return -1
        }
      }
      return -1
    }
  }

  return (
    <>
      <Datatable
        columns={[
          {
            Header: '#',
            accessor: 'i',
            sortType: (rowA, rowB) => rowA.original.i > rowB.original.i ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`font-mono ${props.value < 10 ? 'font-semibold' : ''} my-1`}>
                  {numberFormat(props.value + 1, '0,0')}
                </div>
                :
                <div className="skeleton w-6 h-5 my-1" />
            ),
          },
          {
            Header: 'Router',
            accessor: 'routerAddress',
            disableSortBy: true,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="space-y-1.5 my-1">
                  <div>
                    {ens_data?.[props.value?.toLowerCase()]?.name && (
                      <div className="flex items-center">
                        <Image
                          src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[props.value?.toLowerCase()].name}`}
                          alt=""
                          className="w-6 h-6 rounded-full mr-2"
                        />
                        <Link href={`/router/${props.value?.toLowerCase()}`}>
                          <a className="font-semibold">
                            {ens_data[props.value?.toLowerCase()].name}
                          </a>
                        </Link>
                      </div>
                    )}
                    <div className="flex items-center space-x-1">
                      {ens_data?.[props.value?.toLowerCase()]?.name ?
                        <Copy
                          text={props.value?.toLowerCase()}
                          copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-normal">
                            {ellipseAddress(props.value?.toLowerCase(), 12)}
                          </span>}
                        />
                        :
                        <>
                          <Link href={`/router/${props.value?.toLowerCase()}`}>
                            <a className="uppercase text-xs my-0.5">
                              {ellipseAddress(props.value?.toLowerCase(), 12)}
                            </a>
                          </Link>
                          <Copy text={props.value?.toLowerCase()} />
                        </>
                      }
                    </div>
                  </div>
                  {props.row.original.isRouterContract && (
                    <div className="max-w-min bg-blue-600 dark:bg-blue-500 rounded-lg capitalize flex items-center text-white text-xs space-x-1 mb-0.5 py-1 px-2">
                      <RiFileCodeLine size={16} className="-ml-0.5" />
                      <span className="font-medium">Contract</span>
                    </div>
                  )}
                </div>
                :
                <div className="flex flex-col space-y-2.5 my-1">
                  <div className="skeleton w-32 h-5" />
                  <div className="skeleton w-48 h-4" />
                </div>
            ),
          },
          {
            Header: 'Version',
            accessor: 'routerVersion',
            sortType: (rowA, rowB) => compareVersion(rowA.original.routerVersion, rowB.original.routerVersion),
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`font-mono ${props.value ? '' : 'text-gray-400 dark:text-gray-600'} font-medium my-1`}>
                  {props.value || 'n/a'}
                </div>
                :
                <div className="skeleton w-16 h-5 my-1" />
            ),
          },
          {
            Header: 'Active',
            accessor: 'activeTransactionsLength',
            sortType: (rowA, rowB) => rowA.original.activeTransactionsLength > rowB.original.activeTransactionsLength ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`font-mono ${props.value > 0 ? '' : 'text-gray-400 dark:text-gray-600'} text-right my-1`}>
                  {props.value > -1 ? numberFormat(props.value, '0,0') : 'n/a'}
                </div>
                :
                <div className="skeleton w-12 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Processing',
            accessor: 'trackerLength',
            sortType: (rowA, rowB) => rowA.original.trackerLength > rowB.original.trackerLength ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`font-mono ${props.value > 0 ? '' : 'text-gray-400 dark:text-gray-600'} text-right my-1`}>
                  {props.value > -1 ? numberFormat(props.value, '0,0') : 'n/a'}
                </div>
                :
                <div className="skeleton w-12 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Liquidity',
            accessor: 'amount_value',
            sortType: (rowA, rowB) => rowA.original.amount_value > rowB.original.amount_value ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`font-mono ${props.value > 10000 ? 'font-semibold' : 'text-gray-400 dark:text-gray-600'} text-right my-1`}>
                  {props.value > -1 ? `${currency_symbol}${numberFormat(props.value, props.value > 1000 ? '0,0' : '0,0.000')}` : 'n/a'}
                </div>
                :
                <div className="skeleton w-24 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Volume',
            accessor: 'volume_value',
            sortType: (rowA, rowB) => rowA.original.volume_value > rowB.original.volume_value ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`font-mono ${props.value > 100000 ? 'font-semibold' : 'text-gray-400 dark:text-gray-600'} text-right my-1`}>
                  {props.value > -1 ? `${currency_symbol}${numberFormat(props.value, props.value > 1000 ? '0,0' : '0,0.000')}` : 'n/a'}
                </div>
                :
                <div className="skeleton w-24 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Transactions',
            accessor: 'receivingFulfillTxCount',
            sortType: (rowA, rowB) => rowA.original.total_receivingFulfillTxCount > rowB.original.total_receivingFulfillTxCount ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className={`font-mono ${props.value > 1000 ? 'font-semibold' : 'text-gray-400 dark:text-gray-600'} text-right my-1`}>
                  {props.value > -1 ? numberFormat(props.value, '0,0') : 'n/a'}
                </div>
                :
                <div className="skeleton w-24 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
          {
            Header: 'Supported',
            accessor: 'supportedChains',
            sortType: (rowA, rowB) => (rowA.original.supportedChains ? rowA.original.supportedChains.length : -1) > (rowB.original.supportedChains ? rowB.original.supportedChains.length : -1) ? 1 : -1,
            Cell: props => (
              !props.row.original.skeleton ?
                <div className="xl:w-36 flex flex-wrap items-center justify-end my-1 ml-auto">
                  {props.value ?
                    props.value.length > 0 ?
                      props.value?.map((id, i) => (
                        <Image
                          key={i}
                          src={chains_data?.find(c => c?.chain_id === id)?.image}
                          alt=""
                          className="w-5 sm:w-4 lg:w-6 h-5 sm:h-4 lg:h-6 rounded-full mb-1 ml-0 sm:ml-1 mr-1 sm:mr-0"
                        />
                      ))
                      :
                      <span className="uppercase text-gray-400 dark:text-gray-600">Not Support</span>
                    :
                    <span className="font-mono text-gray-400 dark:text-gray-600">n/a</span>
                  }
                </div>
                :
                <div className="skeleton w-24 h-5 my-1 ml-auto" />
            ),
            headerClassName: 'justify-end text-right',
          },
        ]}
        data={routers && routers_status_data ?
          routers.map((r, i) => { return { ...r, i } })
          :
          [...Array(25).keys()].map(i => { return { i, skeleton: true } })
        }
        noPagination={!routers || routers?.length <= 10 ? true : false}
        defaultPageSize={25}
        className={`min-h-full ${className}`}
      />
      {routers && !(routers.length > 0) && (
        <div className="bg-white dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center my-4 mx-2 py-2">
          No Routers
        </div>
      )}
    </>
  )
}