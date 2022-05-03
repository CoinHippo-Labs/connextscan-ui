import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { constants, utils } from 'ethers'
import { Img } from 'react-image'
import { TailSpin } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'

import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import Datatable from '../datatable'
// import AddToken from '../add-token'
import Copy from '../copy'

import { chainName } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, ellipse, loader_color } from '../../lib/utils'

export default ({ data }) => {
  const { preferences, chains, assets } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { query } = { ...router }
  const { address, chain } = { ...query }

  const [chainSelect, setChainSelect] = useState('')
  const [assetSelect, setAssetSelect] = useState('')

  const chain_data = chains_data?.find(c => c?.id === chain)

  /*const routersComponent = routers_assets_data?.filter(ra => chain ? !routers_status_data || routers_status_data.findIndex(r => r?.routerAddress?.toLowerCase() === ra?.router_id?.toLowerCase() && r?.supportedChains?.includes(chain_data?.chain_id)) > -1 : ra?.router_id?.toLowerCase() === address?.toLowerCase()).map(ra => {
    return {
      ...ra,
      asset_balances: ra?.asset_balances?.filter(ab => ab?.chain_data?.chain_id === chain_data?.chain_id || address),
    }
  }).filter(ra => ra?.asset_balances?.length > 0).map((ra, i) => {
    const routerStatus = chain && routers_status_data?.find(r => r?.routerAddress?.toLowerCase() === ra?.router_id?.toLowerCase())
    const assetsByChains = _.orderBy(Object.entries(_.groupBy(ra?.asset_balances || [], 'chain_data.chain_id')).map(([key, value]) => {
      return {
        chain_id: Number(key),
        chain_data: chains_data?.find(c => c?.chain_id === Number(key)),
        asset_balances: value,
        total: value?.length || 0,
      }
    }).filter(ac => ac?.total > 0), ['total'], ['desc'])

    const data = _.orderBy(ra?.asset_balances?.flatMap(abs => abs).filter(ab => !(chainIdsFilter?.length > 0) || chainIdsFilter.includes(ab.chain_data?.chain_id)) || [], ['amount_value', 'amount'], ['desc', 'desc'])

    return (
      <Widget
        key={i}
        title={!address && (
          <div className="flex items-center justify-between space-x-2">
            <div className={`flex items-${ens_data?.[ra?.router_id.toLowerCase()]?.name ? 'start' : 'center'} space-x-1.5`}>
              {ra?.router_id && (
                <div className="space-y-0.5">
                  {ens_data?.[ra.router_id.toLowerCase()]?.name && (
                    <div className="flex items-center">
                      <Img
                        src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[ra.router_id.toLowerCase()].name}`}
                        alt=""
                        className="w-6 h-6 rounded-full mr-2"
                      />
                      <Link href={`/router/${ra.router_id}`}>
                        <a className="text-blue-600 dark:text-white sm:text-base font-semibold">
                          {ellipse(ens_data[ra.router_id.toLowerCase()].name, 16)}
                        </a>
                      </Link>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    {ens_data?.[ra.router_id.toLowerCase()]?.name ?
                      <Copy
                        text={ra.router_id}
                        copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-normal">
                          {ellipse(ra.router_id, 8)}
                        </span>}
                      />
                      :
                      <>
                        <Link href={`/router/${ra.router_id}`}>
                          <a className="text-blue-600 dark:text-white text-xs font-normal">
                            {ellipse(ra.router_id, 8)}
                          </a>
                        </Link>
                        <Copy text={ra.router_id} />
                      </>
                    }
                  </div>
                </div>
              )}
            </div>
            {routerStatus && (
              <div className="text-right space-y-1.5">
                <div className="whitespace-nowrap uppercase text-gray-400 dark:text-gray-600 text-3xs font-medium">Supported Chains</div>
                <div className="w-32 sm:w-48 flex flex-wrap items-center justify-end">
                  {routerStatus.supportedChains?.length > 0 ?
                    chains_data && routerStatus.supportedChains.map((id, i) => (
                      <Img
                        key={i}
                        src={chains_data.find(c => c?.chain_id === id)?.image}
                        alt=""
                        className="w-4 h-4 rounded-full mb-1 ml-1"
                      />
                    ))
                    :
                    <span>-</span>
                  }
                </div>
              </div>
            )}
          </div>
        )}
        className={`border-0 ${address ? 'bg-transaparent py-0 px-0' : 'shadow-md'} rounded-2xl`}
      >
        {address && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between sm:space-x-2 mx-2">
            {assetsByChains.length > 1 && (
              <div className="flex flex-wrap items-center justify-center mb-3">
                {assetsByChains.map((ac, j) => (
                  <div
                    key={j}
                    onClick={() => setChainIdsFilter(_.concat(chainIdsFilter || [], ac.chain_id).filter(id => id !== ac.chain_id || !chainIdsFilter?.includes(id)))}
                    className={`${chainIdsFilter?.includes(ac.chain?.chain_id) ? 'bg-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-900'} cursor-pointer rounded-lg flex items-center space-x-1.5 mb-0.5 mr-1 sm:mr-0 ml-0 sm:ml-1 py-1 px-1.5`}
                  >
                    <Img
                      src={ac.chain_data?.image}
                      alt=""
                      className="w-4 sm:w-5 h-4 sm:h-5 rounded-full"
                    />
                    <span className="font-mono font-semibold">
                      {number_format(ac.total, '0,0')}
                    </span>
                  </div>
                ))}
                {chainIdsFilter?.length > 0 && (
                  <div
                    onClick={() => setChainIdsFilter(null)}
                    className="hover:bg-gray-100 dark:hover:bg-gray-900 cursor-pointer rounded-lg flex items-center space-x-1.5 mb-0.5 mr-1 sm:mr-0 ml-0 sm:ml-1 py-1 px-1.5"
                  >
                    <span className="font-medium">
                      Reset
                    </span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
        <Datatable
          columns={[
            {
              Header: '#',
              accessor: 'i',
              sortType: (rowA, rowB) => rowA.original.i > rowB.original.i ? 1 : -1,
              Cell: props => (
                !props.row.original.skeleton ?
                  <div className="font-mono my-1">
                    {number_format(props.value + 1, '0,0')}
                  </div>
                  :
                  <div className="skeleton w-6 h-5 my-1" />
              ),
            },
            {
              Header: 'Chain',
              accessor: 'chain_data.title',
              sortType: (rowA, rowB) => chainName(rowA.original.chain) > chainName(rowB.original.chain_data) ? 1 : -1,
              Cell: props => (
                !props.row.original.skeleton ?
                  <Link href={`/${props.row.original.chain_data?.id}`}>
                    <a className="flex items-center space-x-1.5 my-1">
                      <Img
                        src={props.row.original.chain_data?.image}
                        alt=""
                        className="w-5 h-5 rounded-full"
                      />
                      <span className="font-medium">
                        {chainName(props.row.original.chain_data)}
                      </span>
                    </a>
                  </Link>
                  :
                  <div className="skeleton w-32 h-5 my-1" />
              ),
            },
            {
              Header: 'Token',
              accessor: 'asset.name',
              sortType: (rowA, rowB) => rowA.original.asset?.name > rowB.original.asset?.name ? 1 : -1,
              Cell: props => {
                const addToMetaMaskButton = props.row.original?.assetId !== constants.AddressZero && (
                  <button
                    onClick={() => addTokenToMetaMask(props.row.original.chain_data?.chain_id, { ...props.row.original.asset })}
                    className="w-auto min-w-max bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded flex items-center justify-center py-1 px-1.5"
                  >
                    <Img
                      src="/logos/wallets/metamask.png"
                      alt=""
                      className="w-3.5 h-3.5"
                    />
                  </button>
                )

                return !props.row.original.skeleton ?
                  <div className="w-28 flex items-start my-1">
                    <Img
                      src={props.row.original.asset?.image}
                      alt=""
                      className="w-5 h-5 rounded-full mr-2"
                    />
                    <div className="flex flex-col">
                      <div className="flex items-center space-x-2 -mt-0.5">
                        <span className="leading-4 text-xs font-semibold">{props.row.original.asset?.name}</span>
                        {addToMetaMaskButton}
                      </div>
                      {props.row.original.assetId && (
                        <span className="min-w-max flex items-center space-x-0.5">
                          <Copy
                            size={14}
                            text={props.row.original.assetId}
                            copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-medium">
                              {ellipse(props.row.original.assetId, 6)}
                            </span>}
                          />
                          {props.row.original.chain_data?.explorer?.url && (
                            <a
                              href={`${props.row.original.chain_data.explorer.url}${props.row.original.chain_data.explorer[`contract${props.row.original.assetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', props.row.original.assetId)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {props.row.original.chain_data.explorer.icon ?
                                <Img
                                  src={props.row.original.chain_data.explorer.icon}
                                  alt=""
                                  className="w-3.5 h-3.5 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={16} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                        </span>
                      )}
                    </div>
                  </div>
                  :
                  <div className="skeleton w-32 h-5 my-1" />
              },
            },
            {
              Header: 'Liquidity',
              accessor: 'amount',
              sortType: (rowA, rowB) => rowA.original.amount_value > rowB.original.amount_value ? 1 : rowA.original.amount_value < rowB.original.amount_value ? -1 : rowA.original.amount > rowB.original.amount ? 1 : -1,
              Cell: props => (
                !props.row.original.skeleton ?
                  <div className="flex flex-col items-end space-y-1.5 my-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono uppercase text-xs ${props.row.original.amount_value > 100000 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {number_format(props.value, props.value > 100000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {props.row.original.asset?.symbol}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono uppercase text-green-600 dark:text-green-500 text-2xs ${props.row.original.amount_value > 100000 ? 'font-semibold' : 'font-normal'}`}>
                        {currency_symbol}{number_format(props.row.original.amount_value, props.row.original.amount_value > 100000 ? '0,0.00a' : props.row.original.amount_value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                    </div>
                  </div>
                  :
                  <div className="flex flex-col items-end space-y-2 my-1">
                    <div className="skeleton w-28 h-5" />
                    <div className="skeleton w-28 h-5" />
                  </div>
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'Locked',
              accessor: 'locked',
              sortType: (rowA, rowB) => rowA.original.locked_value > rowB.original.locked_value ? 1 : rowA.original.locked_value < rowB.original.locked_value ? -1 : rowA.original.locked > rowB.original.locked ? 1 : -1,
              Cell: props => (
                !props.row.original.skeleton ?
                  <div className="flex flex-col items-end my-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono uppercase text-xs ${props.row.original.locked_value > 100 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {number_format(props.value, props.value > 10000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {props.row.original.asset?.symbol}
                      </span>
                    </div>
                  </div>
                  :
                  <div className="skeleton w-28 h-5 my-1" />
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'Locked In',
              accessor: 'lockedIn',
              sortType: (rowA, rowB) => rowA.original.lockedIn_value > rowB.original.lockedIn_value ? 1 : rowA.original.lockedIn_value < rowB.original.lockedIn_value ? -1 : rowA.original.lockedIn > rowB.original.lockedIn ? 1 : -1,
              Cell: props => (
                !props.row.original.skeleton ?
                  <div className="flex flex-col items-end my-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono uppercase text-xs ${props.row.original.lockedIn_value > 100000 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {number_format(props.value, props.value > 100000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {props.row.original.asset?.symbol}
                      </span>
                    </div>
                  </div>
                  :
                  <div className="skeleton w-28 h-5 my-1" />
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'Supplied',
              accessor: 'supplied',
              sortType: (rowA, rowB) => rowA.original.supplied_value > rowB.original.supplied_value ? 1 : rowA.original.supplied_value < rowB.original.supplied_value ? -1 : rowA.original.supplied > rowB.original.supplied ? 1 : -1,
              Cell: props => (
                !props.row.original.skeleton ?
                  <div className="flex flex-col items-end my-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono uppercase text-xs ${props.row.original.supplied_value > 100000 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {number_format(props.value, props.value > 100000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {props.row.original.asset?.symbol}
                      </span>
                    </div>
                  </div>
                  :
                  <div className="skeleton w-28 h-5 my-1" />
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'Removed',
              accessor: 'removed',
              sortType: (rowA, rowB) => rowA.original.removed_value > rowB.original.removed_value ? 1 : rowA.original.removed_value < rowB.original.removed_value ? -1 : rowA.original.removed > rowB.original.removed ? 1 : -1,
              Cell: props => (
                !props.row.original.skeleton ?
                  <div className="flex flex-col items-end my-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono uppercase text-xs ${props.row.original.removed_value > 10000 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {number_format(props.value, props.value > 100000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {props.row.original.asset?.symbol}
                      </span>
                    </div>
                  </div>
                  :
                  <div className="skeleton w-28 h-5 my-1" />
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
            {
              Header: 'Volume',
              accessor: 'volume',
              sortType: (rowA, rowB) => rowA.original.volume_value > rowB.original.volume_value ? 1 : rowA.original.volume_value < rowB.original.volume_value ? -1 : rowA.original.volume > rowB.original.volume ? 1 : -1,
              Cell: props => (
                !props.row.original.skeleton ?
                  <div className="flex flex-col items-end space-y-1.5 my-1">
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono uppercase text-xs ${props.row.original.volume_value > 1000000 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300'}`}>
                        {number_format(props.value, props.value > 10000000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        {props.row.original.general_asset?.symbol || props.row.original.asset?.symbol}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono uppercase text-red-600 dark:text-red-500 text-2xs ${props.row.original.volume_value > 1000000 ? 'font-semibold' : 'font-normal'}`}>
                        {currency_symbol}{number_format(props.row.original.volume_value, props.row.original.volume_value > 10000000 ? '0,0.00a' : props.row.original.volume_value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                    </div>
                    <div className="flex items-center space-x-1.5">
                      <span className={`font-mono uppercase text-blue-600 dark:text-blue-500 text-xs ${props.row.original.receivingFulfillTxCount > 10000 ? 'font-semibold' : 'font-normal'}`}>
                        {number_format(props.row.original.receivingFulfillTxCount, props.row.original.receivingFulfillTxCount > 1000 ? '0,0.00a' : '0,0')}
                      </span>
                      <span className="text-gray-700 dark:text-gray-300">
                        TXs
                      </span>
                    </div>
                  </div>
                  :
                  <div className="flex flex-col items-end space-y-2 my-1">
                    <div className="skeleton w-28 h-5" />
                    <div className="skeleton w-28 h-5" />
                    <div className="skeleton w-20 h-5" />
                  </div>
              ),
              headerClassName: 'whitespace-nowrap justify-end text-right',
            },
          ]}
          data={data ?
            data.map((ab, j) => { return { ...ab, i: j } })
            :
            [...Array(10).keys()].map(j => { return { i: j, skeleton: true } })
          }
          noPagination={data?.length <= 10 ? true : false}
          defaultPageSize={10}
          className="min-h-full no-border"
        />
      </Widget>
    )
  })*/

  return (
    <div className="space-y-2">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="text-base font-bold">
          Liquidity
        </div>
        <div className="flex items-center space-x-2">
          <SelectChain
            value={chainSelect}
            onSelect={c => setChainSelect(c)}
          />
          <SelectAsset
            value={assetSelect}
            onSelect={a => setAssetSelect(a)}
            chain={chainSelect}
          />
        </div>
      </div>
      {data ?
        null
        :
        <TailSpin color={loader_color(theme)} width="32" height="32" />
      }
    </div>
  )
}