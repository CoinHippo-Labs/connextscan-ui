import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Web3 from 'web3'
import { constants, utils } from 'ethers'
import { Triangle, ThreeDots } from 'react-loader-spinner'
import StackGrid from 'react-stack-grid'
import { MdOutlineRouter, MdOutlineWindow } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'
import { BsJournalCode } from 'react-icons/bs'
import { GoCode } from 'react-icons/go'
import { BiTable } from 'react-icons/bi'

import Datatable from '../datatable'
import Copy from '../copy'
import Popover from '../popover'
import Widget from '../widget'
import Image from '../image'

import { chainTitle } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { numberFormat, ellipseAddress } from '../../lib/utils'

export default function Assets({ assetBy = 'assets', addTokenToMetaMaskFunction }) {
  const { preferences, chains, ens, routers_status, routers_assets } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, ens: state.ens, routers_status: state.routers_status, routers_assets: state.routers_assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { ens_data } = { ...ens }
  const { routers_status_data } = { ...routers_status }
  const { routers_assets_data } = { ...routers_assets }

  const router = useRouter()
  const { query } = { ...router }
  const { address, blockchain_id } = { ...query }

  const [view, setView] = useState('table')
  const [chainIdsFilter, setChainIdsFilter] = useState(null)
  const [web3, setWeb3] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [addTokenData, setAddTokenData] = useState(null)
  const [timer, setTimer] = useState(null)

  useEffect(() => {
    if (!addTokenToMetaMaskFunction) {
      if (!web3) {
        setWeb3(new Web3(Web3.givenProvider))
      }
      else {
        try {
          web3.currentProvider._handleChainChanged = e => {
            try {
              setChainId(Web3.utils.hexToNumber(e?.chainId))
            } catch (error) {}
          }
        } catch (error) {}
      }
    }
  }, [web3])

  useEffect(() => {
    if (addTokenData?.chain_id === chainId && addTokenData?.contract) {
      addTokenToMetaMask(addTokenData.chain_id, addTokenData.contract)
    }
  }, [chainId, addTokenData])

  useEffect(() => {
    const run = async () => setTimer(moment().unix())
    if (!timer) {
      run()
    }
    const interval = setInterval(() => run(), 0.5 * 1000)
    return () => clearInterval(interval)
  }, [timer])

  const addTokenToMetaMask = addTokenToMetaMaskFunction || (async (chain_id, contract) => {
    if (web3 && contract) {
      if (chain_id === chainId) {
        try {
          const response = await web3.currentProvider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: contract.contract_address,
                symbol: contract.symbol,
                decimals: contract.contract_decimals,
                image: `${contract.image?.startsWith('/') ? process.env.NEXT_PUBLIC_SITE_URL : ''}${contract.image}`,
              },
            },
          })
        } catch (error) {}

        setAddTokenData(null)
      }
      else {
        switchNetwork(chain_id, contract)
      }
    }
  })

  const switchNetwork = async (chain_id, contract) => {
    try {
      await web3.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: utils.hexValue(chain_id) }],
      })
    } catch (error) {
      if (error.code === 4902) {
        try {
          await web3.currentProvider.request({
            method: 'wallet_addEthereumChain',
            params: chains_data?.find(c => c.chain_id === chain_id)?.provider_params,
          })
        } catch (error) {}
      }
    }

    if (contract) {
      setAddTokenData({ chain_id, contract })
    }
  }

  const chain = chains_data?.find(c => c?.id === blockchain_id)

  const maxTransfers = routers_assets_data && _.orderBy(
    Object.values(_.groupBy(routers_assets_data.flatMap(ra => ra?.asset_balances?.filter(ab => ab?.chain?.chain_id === chain?.chain_id) || []), 'assetId')).map(a => {
      let assets_from_chains

      if (a && routers_status_data) {
        assets_from_chains = Object.fromEntries(chains_data?.filter(c => !c.disabled).map(c => {
          const assets = a.filter(_a => routers_status_data?.findIndex(r => r?.routerAddress?.toLowerCase() === _a?.router?.id?.toLowerCase() && r?.supportedChains?.includes(c?.chain_id) && r?.supportedChains?.includes(chain?.chain_id)) > -1)

          return [c.chain_id, _.maxBy(assets, 'amount')]
        }).filter(([key, value]) => key !== chain?.chain_id && value))
      }

      return {
        ..._.maxBy(a, 'amount_value'),
        total_amount: _.sumBy(a, 'amount'),
        total_amount_value: _.sumBy(a, 'amount_value'),
        assets_from_chains,
      }
    }), ['value'], ['desc']
  )

  const routersComponent = routers_assets_data?.filter(ra => blockchain_id ? !routers_status_data || routers_status_data.findIndex(r => r?.routerAddress?.toLowerCase() === ra?.router_id?.toLowerCase() && r?.supportedChains?.includes(chain?.chain_id)) > -1 : ra?.router_id?.toLowerCase() === address?.toLowerCase()).map(ra => {
    return {
      ...ra,
      asset_balances: ra?.asset_balances?.filter(ab => ab?.chain?.chain_id === chain?.chain_id || address),
    }
  }).filter(ra => ra?.asset_balances?.length > 0).map((ra, i) => {
    const routerStatus = blockchain_id && routers_status_data?.find(r => r?.routerAddress?.toLowerCase() === ra?.router_id?.toLowerCase())
    const assetsByChains = _.orderBy(Object.entries(_.groupBy(ra?.asset_balances || [], 'chain.chain_id')).map(([key, value]) => {
      return {
        chain_id: Number(key),
        chain: chains_data?.find(c => c?.chain_id === Number(key)),
        asset_balances: value,
        total: value?.length || 0,
      }
    }).filter(ac => ac?.total > 0), ['total'], ['desc'])

    const data = _.orderBy(ra?.asset_balances?.flatMap(abs => abs).filter(ab => !(chainIdsFilter?.length > 0) || chainIdsFilter.includes(ab.chain?.chain_id)) || [], ['amount_value', 'amount'], ['desc', 'desc'])

    return (
      <Widget
        key={i}
        title={!address && (
          <div className="flex items-center justify-between space-x-2">
            <div className={`flex items-${ens_data?.[ra?.router_id.toLowerCase()]?.name ? 'start' : 'center'} space-x-1.5`}>
              <MdOutlineRouter size={20} className="text-gray-400 dark:text-gray-600 mb-0.5" />
              {ra?.router_id && (
                <div className="space-y-0.5">
                  {ens_data?.[ra.router_id.toLowerCase()]?.name && (
                    <div className="flex items-center">
                      <Image
                        src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[ra.router_id.toLowerCase()].name}`}
                        alt=""
                        className="w-6 h-6 rounded-full mr-2"
                      />
                      <Link href={`/router/${ra.router_id}`}>
                        <a className="text-blue-600 dark:text-white sm:text-base font-semibold">
                          {ellipseAddress(ens_data[ra.router_id.toLowerCase()].name, 16)}
                        </a>
                      </Link>
                    </div>
                  )}
                  <div className="flex items-center space-x-1">
                    {ens_data?.[ra.router_id.toLowerCase()]?.name ?
                      <Copy
                        text={ra.router_id}
                        copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-normal">
                          {ellipseAddress(ra.router_id, 8)}
                        </span>}
                      />
                      :
                      <>
                        <Link href={`/router/${ra.router_id}`}>
                          <a className="text-blue-600 dark:text-white text-xs font-normal">
                            {ellipseAddress(ra.router_id, 8)}
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
                      <Image
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
            <div className="flex items-center justify-center space-x-1.5 mb-3">
              {['table', 'card'].map((v, j) => (
                <button
                  key={j}
                  onClick={() => setView(v)}
                  className={`${v === view ? 'bg-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-900'} cursor-pointer rounded-lg py-1.5 px-2`}
                >
                  {v === 'table' ?
                    <BiTable size={20} />
                    :
                    <MdOutlineWindow size={18} />
                  }
                </button>
              ))}
            </div>
            {assetsByChains.length > 1 && (
              <div className="flex flex-wrap items-center justify-center mb-3">
                {assetsByChains.map((ac, j) => (
                  <div
                    key={j}
                    onClick={() => setChainIdsFilter(_.concat(chainIdsFilter || [], ac.chain_id).filter(id => id !== ac.chain_id || !chainIdsFilter?.includes(id)))}
                    className={`${chainIdsFilter?.includes(ac.chain?.chain_id) ? 'bg-gray-200 hover:bg-gray-100 dark:bg-gray-800 dark:hover:bg-gray-900' : 'hover:bg-gray-100 dark:hover:bg-gray-900'} cursor-pointer rounded-lg flex items-center space-x-1.5 mb-0.5 mr-1 sm:mr-0 ml-0 sm:ml-1 py-1 px-1.5`}
                  >
                    <Image
                      src={ac.chain?.image}
                      alt=""
                      className="w-4 sm:w-5 h-4 sm:h-5 rounded-full"
                    />
                    <span className="font-mono font-semibold">
                      {numberFormat(ac.total, '0,0')}
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
        {(assetBy !== 'routers' || address) && view === 'table' ?
          <Datatable
            columns={[
              {
                Header: '#',
                accessor: 'i',
                sortType: (rowA, rowB) => rowA.original.i > rowB.original.i ? 1 : -1,
                Cell: props => (
                  !props.row.original.skeleton ?
                    <div className="font-mono my-1">
                      {numberFormat(props.value + 1, '0,0')}
                    </div>
                    :
                    <div className="skeleton w-6 h-5 my-1" />
                ),
              },
              {
                Header: 'Chain',
                accessor: 'chain.title',
                sortType: (rowA, rowB) => chainTitle(rowA.original.chain) > chainTitle(rowB.original.chain) ? 1 : -1,
                Cell: props => (
                  !props.row.original.skeleton ?
                    <Link href={`/${props.row.original.chain?.id}`}>
                      <a className="flex items-center space-x-1.5 my-1">
                        <Image
                          src={props.row.original.chain?.image}
                          alt=""
                          className="w-5 h-5 rounded-full"
                        />
                        <span className="font-medium">
                          {chainTitle(props.row.original.chain)}
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
                      onClick={() => addTokenToMetaMask(props.row.original.chain?.chain_id, { ...props.row.original.asset })}
                      className="w-auto min-w-max bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded flex items-center justify-center py-1 px-1.5"
                    >
                      <Image
                        src="/logos/wallets/metamask.png"
                        alt=""
                        className="w-3.5 h-3.5"
                      />
                    </button>
                  )

                  return !props.row.original.skeleton ?
                    <div className="w-28 flex items-start my-1">
                      <Image
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
                                {ellipseAddress(props.row.original.assetId, 6)}
                              </span>}
                            />
                            {props.row.original.chain?.explorer?.url && (
                              <a
                                href={`${props.row.original.chain.explorer.url}${props.row.original.chain.explorer[`contract${props.row.original.assetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', props.row.original.assetId)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
                              >
                                {props.row.original.chain.explorer.icon ?
                                  <Image
                                    src={props.row.original.chain.explorer.icon}
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
                          {numberFormat(props.value, props.value > 100000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {props.row.original.asset?.symbol}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`font-mono uppercase text-green-600 dark:text-green-500 text-2xs ${props.row.original.amount_value > 100000 ? 'font-semibold' : 'font-normal'}`}>
                          {currency_symbol}{numberFormat(props.row.original.amount_value, props.row.original.amount_value > 100000 ? '0,0.00a' : props.row.original.amount_value > 1000 ? '0,0' : '0,0.00')}
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
                          {numberFormat(props.value, props.value > 10000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
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
                          {numberFormat(props.value, props.value > 100000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
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
                          {numberFormat(props.value, props.value > 100000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
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
                          {numberFormat(props.value, props.value > 100000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
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
                          {numberFormat(props.value, props.value > 10000000 ? '0,0.00a' : props.value > 1000 ? '0,0' : '0,0.00')}
                        </span>
                        <span className="text-gray-700 dark:text-gray-300">
                          {props.row.original.general_asset?.symbol || props.row.original.asset?.symbol}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`font-mono uppercase text-red-600 dark:text-red-500 text-2xs ${props.row.original.volume_value > 1000000 ? 'font-semibold' : 'font-normal'}`}>
                          {currency_symbol}{numberFormat(props.row.original.volume_value, props.row.original.volume_value > 10000000 ? '0,0.00a' : props.row.original.volume_value > 1000 ? '0,0' : '0,0.00')}
                        </span>
                      </div>
                      <div className="flex items-center space-x-1.5">
                        <span className={`font-mono uppercase text-blue-600 dark:text-blue-500 text-xs ${props.row.original.receivingFulfillTxCount > 10000 ? 'font-semibold' : 'font-normal'}`}>
                          {numberFormat(props.row.original.receivingFulfillTxCount, props.row.original.receivingFulfillTxCount > 1000 ? '0,0.00a' : '0,0')}
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
          :
          <div className={`grid grid-flow-row grid-cols-1 ${address ? 'sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5' : 'sm:grid-cols-2 mt-4 mb-2'} gap-0`}>
            {data.map((ab, j) => {
              const addToMetaMaskButton = ab?.assetId !== constants.AddressZero && (
                <button
                  onClick={() => addTokenToMetaMask(ab?.chain?.chain_id, { ...ab?.asset })}
                  className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded flex items-center justify-center py-1 px-1.5"
                >
                  <Image
                    src="/logos/wallets/metamask.png"
                    alt=""
                    className="w-3.5 h-3.5"
                  />
                </button>
              )

              return (
                <div key={j}>
                  {ab?.asset ?
                    <div className="min-h-full border py-5 px-4" style={{ borderColor: ab.chain?.color }}>
                      <div className="space-y-0.5">
                        <div className="flex items-start">
                          <Image
                            src={ab.asset.image}
                            alt=""
                            className="w-5 h-5 rounded-full mr-2"
                          />
                          <div className="flex flex-col">
                            <span className="leading-4 text-xs font-semibold">{ab.asset.name}</span>
                            {ab.assetId && (
                              <span className="min-w-max flex items-center space-x-0.5">
                                <Copy
                                  size={14}
                                  text={ab.assetId}
                                  copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-medium">
                                    {ellipseAddress(ab.assetId, 6)}
                                  </span>}
                                />
                                {ab.chain?.explorer?.url && (
                                  <a
                                    href={`${ab.chain.explorer.url}${ab.chain.explorer[`contract${ab.assetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', ab.assetId)}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 dark:text-white"
                                  >
                                    {ab.chain.explorer.icon ?
                                      <Image
                                        src={ab.chain.explorer.icon}
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
                          {ab.chain?.image && (
                            <Link href={`/${ab.chain.id}`}>
                              <a className="min-w-max w-4 h-4 relative -top-3.5 -right-2.5 ml-auto">
                                <Image
                                  src={ab.chain.image}
                                  alt=""
                                  className="w-4 h-4 rounded-full"
                                />
                              </a>
                            </Link>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center justify-center mt-3.5">
                        <div className="w-full text-center space-y-1">
                          <div className="font-mono text-xs">
                            {typeof ab.amount === 'number' ?
                              <>
                                <span className={`uppercase ${ab.amount_value > 100000 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300 font-medium'} text-base mr-1.5`}>
                                  {numberFormat(ab.amount, ab.amount > 10000 ? '0,0.00a' : ab.amount > 10 ? '0,0' : '0,0.000')}
                                </span>
                                <span className="text-gray-400 dark:text-gray-600 text-xs font-medium">{ab.asset.symbol}</span>
                              </>
                              :
                              <span className="text-gray-400 dark:text-gray-600">n/a</span>
                            }
                          </div>
                          <div className={`max-w-min bg-gray-100 dark:bg-gray-${address ? 900 : 800} rounded-lg font-mono text-2xs mx-auto py-1.5 px-2.5`}>
                            {typeof ab.amount_value === 'number' ?
                              <span className={`uppercase ${ab.amount_value > 100000 ? 'text-gray-800 dark:text-gray-200 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                                {currency_symbol}{numberFormat(ab.amount_value, ab.amount_value > 100000 ? '0,0.00a' : ab.amount_value > 1000 ? '0,0' : '0,0.000')}
                              </span>
                              :
                              <span className="text-gray-400 dark:text-gray-600">n/a</span>
                            }
                          </div>
                        </div>
                        <div className="min-w-max relative -bottom-3.5 -right-0 mb-0.5 ml-auto">
                          <Popover
                            placement="left"
                            title={<span className="normal-case text-3xs">Add token</span>}
                            content={<div className="w-32 text-3xs">Add <span className="font-semibold">{ab.asset.symbol}</span> to MetaMask</div>}
                            titleClassName="py-0.5"
                            contentClassName="py-1.5"
                          >
                            {addToMetaMaskButton}
                          </Popover>
                        </div>
                      </div>
                      <div className="space-y-1.5 mt-4">
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-500">Locked</span>
                          <div className="text-right">
                            <div className="font-mono text-xs">
                              {typeof ab.locked === 'number' ?
                                <>
                                  <span className={`uppercase ${ab.locked_value > 100 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300 font-medium'} text-sm mr-1.5`}>
                                    {numberFormat(ab.locked, ab.locked > 10000 ? '0,0.00a' : ab.locked > 1000 ? '0,0' : '0,0.000')}
                                  </span>
                                  <span className="text-gray-400 dark:text-gray-600 text-2xs font-medium">{ab.asset.symbol}</span>
                                </>
                                :
                                <span className="text-gray-400 dark:text-gray-600">n/a</span>
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-500">Locked In</span>
                          <div className="text-right">
                            <div className="font-mono text-xs">
                              {typeof ab.lockedIn === 'number' ?
                                <>
                                  <span className={`uppercase ${ab.lockedIn_value > 100 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300 font-medium'} text-sm mr-1.5`}>
                                    {numberFormat(ab.lockedIn, ab.lockedIn > 10000 ? '0,0.00a' : ab.lockedIn > 1000 ? '0,0' : '0,0.000')}
                                  </span>
                                  <span className="text-gray-400 dark:text-gray-600 text-2xs font-medium">{ab.asset.symbol}</span>
                                </>
                                :
                                <span className="text-gray-400 dark:text-gray-600">n/a</span>
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-500">Supplied</span>
                          <div className="text-right">
                            <div className="font-mono text-xs">
                              {typeof ab.supplied === 'number' ?
                                <>
                                  <span className={`uppercase ${ab.supplied_value > 100000 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300 font-medium'} text-sm mr-1.5`}>
                                    {numberFormat(ab.supplied, ab.supplied > 100000 ? '0,0.00a' : ab.supplied > 1000 ? '0,0' : '0,0.000')}
                                  </span>
                                  <span className="text-gray-400 dark:text-gray-600 text-2xs font-medium">{ab.asset.symbol}</span>
                                </>
                                :
                                <span className="text-gray-400 dark:text-gray-600">n/a</span>
                              }
                            </div>
                          </div>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-gray-500 dark:text-gray-500">Removed</span>
                          <div className="text-right">
                            <div className="font-mono text-xs">
                              {typeof ab.removed === 'number' ?
                                <>
                                  <span className={`uppercase ${ab.removed_value > 10000 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300 font-medium'} text-sm mr-1.5`}>
                                    {numberFormat(ab.removed, ab.removed > 100000 ? '0,0.00a' : ab.removed > 1000 ? '0,0' : '0,0.000')}
                                  </span>
                                  <span className="text-gray-400 dark:text-gray-600 text-2xs font-medium">{ab.asset.symbol}</span>
                                </>
                                :
                                <span className="text-gray-400 dark:text-gray-600">n/a</span>
                              }
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    :
                    <div className="w-full h-28 shadow flex items-center justify-center">
                      <Triangle color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
                    </div>
                  }
                </div>
              )
            })}
          </div>
        }
      </Widget>
    )
  })

  return (
    <>
      {assetBy === 'routers' ?
        address ?
          routersComponent
          :
          !routers_status_data ?
            <div className="w-full flex items-center justify-center">
              <ThreeDots color={theme === 'dark' ? 'white' : '#3B82F6'} width="24" height="24" />
            </div>
            :
            routersComponent.length < 1 ?
              <div className="w-full text-gray-400 dark:text-gray-600 text-base italic text-center">
                No Routers Supported
              </div>
              :
              <>
                <StackGrid
                  columnWidth={458}
                  gutterWidth={16}
                  gutterHeight={16}
                  className="hidden sm:block"
                >
                  {routersComponent}
                </StackGrid>
                <div className="block sm:hidden space-y-3">
                  {routersComponent}
                </div>
              </>
        :
        !maxTransfers ?
          <div className="w-full flex items-center justify-center">
            <ThreeDots color={theme === 'dark' ? 'white' : '#3B82F6'} width="24" height="24" />
          </div>
          :
          maxTransfers.length < 1 ?
            <div className="w-full text-gray-400 dark:text-gray-600 text-base italic text-center">
              No Assets
            </div>
            :
            <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
              {maxTransfers.map((ab, i) => { return { ...ab, i } }).map((ab, i) => {
                const addToMetaMaskButton = ab?.assetId !== constants.AddressZero && (
                  <button
                    onClick={() => addTokenToMetaMask(ab?.chain?.chain_id, { ...ab?.asset })}
                    className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded flex items-center justify-center py-1.5 px-2"
                  >
                    <Image
                      src="/logos/wallets/metamask.png"
                      alt=""
                      className="w-4 h-4"
                    />
                  </button>
                )

                return (
                  <div key={i} className="bg-white dark:bg-gray-900 shadow rounded-2xl space-y-4 p-4">
                    <div className="space-y-2">
                      {ab?.asset && (
                        <div className="flex items-center">
                          <Image
                            src={ab.asset.image}
                            alt=""
                            className="w-8 h-8 rounded-full mr-2.5"
                          />
                          <div className="space-y-0.5">
                            <div className="text-sm font-semibold">{ab.asset.name}</div>
                            <div className="text-gray-400 dark:text-gray-600 text-xs">{ab.asset.symbol}</div>
                          </div>
                          <div className="min-w-max relative -top-1.5 -right-0.5 ml-auto">
                            <Popover
                              placement="left"
                              title={<span className="normal-case text-xs">Add token</span>}
                              content={<div className="w-36 text-2xs">Add <span className="font-semibold">{ab.asset.symbol}</span> to MetaMask</div>}
                              titleClassName="py-1"
                            >
                              {addToMetaMaskButton}
                            </Popover>
                          </div>
                        </div>
                      )}
                      {ab?.assetId && (
                        <div className="flex items-center space-x-1">
                          <Copy
                            text={ab.assetId}
                            copyTitle={<span className="text-gray-400 dark:text-gray-600 font-normal">
                              {ellipseAddress(ab.assetId, 6)}
                            </span>}
                          />
                          {chain?.explorer?.url && (
                            <a
                              href={`${chain.explorer.url}${chain.explorer[`contract${ab.assetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', ab.assetId)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {chain.explorer.icon ?
                                <Image
                                  src={chain.explorer.icon}
                                  alt=""
                                  className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={16} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="space-y-1">
                      <div className="uppercase text-gray-600 dark:text-gray-400 text-2xs font-medium">Max Transfers Size</div>
                      <div className="flex items-center space-x-2">
                        {typeof ab?.amount === 'number' ?
                          <>
                            <span className="font-mono uppercase text-lg font-semibold">
                              {numberFormat(ab.amount, ab.amount > 10000000 ? '0,0.00a' : ab.amount > 1000 ? '0,0' : '0,0.000')}
                            </span>
                            <span className="text-gray-400 dark:text-gray-600 text-lg">{ab?.asset?.symbol}</span>
                          </>
                          :
                          <span className="text-gray-400 dark:text-gray-600">n/a</span>
                        }
                        <div className="w-full flex items-center justify-end">
                          {ab.assets_from_chains && (
                            <Popover
                              placement="left"
                              title={<span className="text-xs">Transfer Routes</span>}
                              content={<div className="w-48 flex-col space-y-1.5">
                                {Object.entries(ab.assets_from_chains).length > 0 ?
                                  _.orderBy(Object.entries(ab.assets_from_chains).map(([key, value]) => { return { key, value } }), ['value.amount'], ['desc']).map(({ key, value }) => (
                                    <div key={key} className="flex items-center justify-between space-x-1">
                                      <div className="flex items-center space-x-1.5">
                                        <Image
                                          src={chains_data?.find(c => c?.chain_id === Number(key))?.image}
                                          alt=""
                                          className="w-5 h-5 rounded-full"
                                        />
                                        <GoCode size={16} className="min-w-min" />
                                        <Image
                                          src={chain?.image}
                                          alt=""
                                          className="w-5 h-5 rounded-full"
                                        />
                                      </div>
                                      <div className="text-3xs space-x-1">
                                        <span className="font-mono uppercase">{numberFormat(value.amount, value.amount > 10000000 ? '0,0.00a' : value.amount > 1000 ? '0,0' : '0,0.00')}</span>
                                        <span className="text-gray-400 dark:text-gray-600">{value.asset?.symbol}</span>
                                      </div>
                                    </div>
                                  ))
                                  :
                                  'No Routes'
                                }
                              </div>}
                              titleClassName="py-1.5"
                            >
                              <BsJournalCode size={20} />
                            </Popover>
                          )}
                          {!routers_status_data && (
                            <ThreeDots color={theme === 'dark' ? 'white' : '#3B82F6'} width="20" height="20" />
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="space-y-1">
                      <div className="uppercase text-gray-600 dark:text-gray-400 text-2xs font-medium">Total Liquidity</div>
                      <div className="flex items-center space-x-2">
                        {typeof ab?.total_amount === 'number' ?
                          <>
                            <span className="font-mono uppercase text-lg font-semibold">
                              {numberFormat(ab.total_amount, ab.total_amount > 10000000 ? '0,0.00a' : ab.total_amount > 1000 ? '0,0' : '0,0.000')}
                            </span>
                            <span className="text-gray-400 dark:text-gray-600 text-lg">{ab?.asset?.symbol}</span>
                          </>
                          :
                          <span className="text-gray-400 dark:text-gray-600">n/a</span>
                        }
                      </div>
                      <div className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-sm py-1 px-2">
                        {typeof ab?.total_amount_value === 'number' ?
                          <span className={`uppercase ${ab?.total_amount_value > 100000 ? 'text-gray-800 dark:text-gray-200 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                            {currency_symbol}{numberFormat(ab.total_amount_value, ab.total_amount_value > 1000000 ? '0,0.00a' : ab.total_amount_value > 1000 ? '0,0' : '0,0.000')}
                          </span>
                          :
                          <span className="text-gray-400 dark:text-gray-600">n/a</span>
                        }
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
      }
    </>
  )
}