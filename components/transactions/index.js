import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Web3 from 'web3'
import { constants, utils } from 'ethers'
import BigNumber from 'bignumber.js'
import { Puff, TailSpin } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'
import { FaCheckCircle, FaRegCheckCircle, FaTimesCircle } from 'react-icons/fa'
import { GoCode } from 'react-icons/go'

import Datatable from '../datatable'
import Copy from '../copy'
import Popover from '../popover'
import Image from '../image'
import { transactions as getTransactions } from '../../lib/api/subgraph'
import { domains, getENS } from '../../lib/api/ens'
import { chainTitle } from '../../lib/object/chain'
import { numberFormat, ellipseAddress } from '../../lib/utils'

import { ENS_DATA, TRANSACTIONS_DATA } from '../../reducers/types'

const filter_statuses = [
  { status: 'Preparing', color: 'blue' },
  { status: 'Prepared', color: 'yellow' },
  { status: 'Fulfilling', color: 'green' },
  { status: 'Fulfilled', color: 'green' },
  { status: 'Cancelled', color: 'red' },
]

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function Transactions({ addTokenToMetaMaskFunction, className = '' }) {
  const dispatch = useDispatch()
  const { preferences, chains, tokens, ens, transactions, sdk } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, tokens: state.tokens, ens: state.ens, transactions: state.transactions, sdk: state.sdk }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { tokens_data } = { ...tokens }
  const { ens_data } = { ...ens }
  const { transactions_data } = { ...transactions }
  const { sdk_data } = { ...sdk }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { address, blockchain_id } = { ...query }

  const [txs, setTxs] = useState(null)
  const [statuses, setStatuses] = useState(filter_statuses.map(({ status }) => status))
  const [web3, setWeb3] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [addTokenData, setAddTokenData] = useState(null)

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
    if (pathname || address || blockchain_id) {
      dispatch({
        type: TRANSACTIONS_DATA,
        value: null,
      })

      setTxs(null)
      setStatuses(filter_statuses.filter(({ status }) => !blockchain_id || !status?.endsWith('ing')).map(({ status }) => status))
    }
  }, [pathname, address, blockchain_id])

  useEffect(() => {
    const controller = new AbortController()

    const getTxs = async chain => {
      if (chain && !chain.disabled) {
        if (!controller.signal.aborted) {
          let params

          if (address) {
            if (['/router/[address]'].includes(pathname)) {
              params = { where: `{ router: "${address.toLowerCase()}" }`, max_size: 1000 }
            }
            else if (['/address/[address]'].includes(pathname)) {
              params = { where: `{ user: "${address.toLowerCase()}" }`, max_size: 500 }
            }
          }

          if (!blockchain_id || chain.id === blockchain_id) {
            const response = await getTransactions(sdk_data, chain.chain_id, null, params, chains_data, tokens_data)

            dispatch({
              type: TRANSACTIONS_DATA,
              value: { [`${chain.chain_id}`]: response?.data || [] },
            })
          }
        }
      }
    }

    const getData = () => {
      if (chains_data && sdk_data) {
        chains_data.forEach(c => getTxs(c))
      }
    }

    getData()

    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [pathname, address, blockchain_id, sdk_data])

  useEffect(() => {
    const getData = async () => {
      if (tokens_data && transactions_data) {
        let data = Object.entries(transactions_data).flatMap(([key, value]) => {
          return value?.filter(t => t).map(t => {
            return {
              ...t,
              sendingAsset: t.sendingAsset || tokens_data?.find(_t => _t?.chain_id === t.sendingChainId && _t?.contract_address === t.sendingAssetId),
              receivingAsset: t.receivingAsset || tokens_data?.find(_t => _t?.chain_id === t.receivingChainId && _t?.contract_address === t.receivingAssetId),
            }
          })
        }).map(t => {
          return {
            ...t,
            sending_amount: t.sendingAsset && BigNumber(!isNaN(t.amount) ? t.amount : 0).shiftedBy(-t.sendingAsset.contract_decimals).toNumber(),
            receiving_amount: t.receivingAsset && BigNumber(!isNaN(t.amount) ? t.amount : 0).shiftedBy(-t.receivingAsset.contract_decimals).toNumber(),
          }
        })

        data = _.orderBy(Object.entries(_.groupBy(_.orderBy(data, ['order', 'preparedTimestamp'], ['desc', 'desc']), 'transactionId')).map(([key, value]) => {
          return {
            txs: _.orderBy(_.uniqBy(value, 'chainId'), ['order', 'preparedTimestamp'], ['asc', 'asc']).map(t => {
              return {
                id: t.chainTx,
                chain_id: t.chainId,
                status: t.status,
              }
            }),
            ...(_.maxBy(value, ['order', 'preparedTimestamp'])),
            sending_amount: value?.find(t => t?.chainId === t.sendingChainId)?.sending_amount,
            receiving_amount: value?.find(t => t?.chainId === t.receivingChainId)?.receiving_amount,
          }
        }), ['preparedTimestamp'], ['desc']).map(t => {
          return {
            ...t,
            crosschain_status: blockchain_id ? t.status : t.status === 'Prepared' && t.txs?.length === 1 && t.txs[0]?.chain_id === t.sendingChainId ? 'Preparing' : t.status === 'Fulfilled' && t.txs?.findIndex(_t => _t?.status === 'Prepared') > -1 ? 'Fulfilling' : t.status,
          }
        })

        const ready = Object.keys(transactions_data).filter(cid => !blockchain_id || chains_data?.find(c => c?.id === blockchain_id)?.chain_id === Number(cid)).length >= (blockchain_id ? chains_data?.findIndex(c => c?.id === blockchain_id && c.is_staging) > -1 ? 0 : 1 : chains_data?.filter(c => !c?.disabled && !c?.is_staging).length) &&
          chains_data?.filter(c => !c?.disabled && !c?.is_staging && transactions_data[c?.chain_id]?.length > 0).length <= Object.keys(_.groupBy(tokens_data, 'chain_id')).length

        if ((data.length > 0 || address || blockchain_id) && ready) {
          setTxs({ data })
        }

        if (ready) {
          const evmAddresses = _.slice(_.uniq(data.flatMap(t => [t?.sendingAddress?.toLowerCase(), t?.receivingAddress?.toLowerCase()]).filter(id => id && !ens_data?.[id])), 0, 50)
          if (evmAddresses.length > 0) {
            let ensData
            const addressChunk = _.chunk(evmAddresses, 50)

            for (let i = 0; i < addressChunk.length; i++) {
              const domainsResponse = await domains({ where: `{ resolvedAddress_in: [${addressChunk[i].map(id => `"${id?.toLowerCase()}"`).join(',')}] }` })
              ensData = _.concat(ensData || [], domainsResponse?.data || [])
            }

            if (ensData?.length > 0) {
              const ensResponses = {}
              for (let i = 0; i < evmAddresses.length; i++) {
                const evmAddress = evmAddresses[i]?.toLowerCase()
                const resolvedAddresses = ensData.filter(d => d?.resolvedAddress?.id?.toLowerCase() === evmAddress)
                if (resolvedAddresses.length > 1) {
                  ensResponses[evmAddress] = await getENS(evmAddress)
                }
                else if (resolvedAddresses.length < 1) {
                  ensData.push({ resolvedAddress: { id: evmAddress } })
                }
              }

              dispatch({
                type: ENS_DATA,
                value: Object.fromEntries(ensData.filter(d => !ensResponses?.[d?.resolvedAddress?.id?.toLowerCase()]?.reverseRecord || d?.name === ensResponses?.[d?.resolvedAddress?.id?.toLowerCase()].reverseRecord).map(d => [d?.resolvedAddress?.id?.toLowerCase(), { ...d }])),
              })
            }
          }
        }
      }
    }

    getData()
  }, [tokens_data, transactions_data])

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

  const filteredTxs = txs?.data?.filter(t => statuses.length < 1 || statuses.includes(t.crosschain_status))

  return (
    <>
      <div className="flex flex-wrap items-center sm:justify-end mb-2 mx-3">
        <span className="hidden sm:block text-gray-400 dark:text-gray-600 mr-3">Filter:</span>
        {filter_statuses.filter(({ status }) => !blockchain_id || !status?.endsWith('ing')).map(({ status, color }, i) => (
          <button
            key={i}
            onClick={() => setStatuses(_.uniq(statuses.includes(status) ? statuses.filter(s => s !== status) : _.concat(statuses, status)))}
            className={`btn btn-sm btn-raised min-w-max btn-rounded flex items-center ${statuses.includes(status) ? `bg-${color}-${status?.endsWith('ing') ? 400 : 500} text-white` : `bg-transparent hover:bg-${color}-50 text-${color}-500 hover:text-${color}-600 dark:hover:bg-gray-800 dark:text-gray-200 dark:hover:text-white`} text-xs my-1 mr-${i === filter_statuses.filter(({ status }) => !blockchain_id || !status?.endsWith('ing')).length - 1 ? 0 : '2 md:mr-3'} py-2 px-1.5`}
          >
            {status}
          </button>
        ))}
      </div>
      <div>
        <Datatable
          columns={[
            {
              Header: 'Tx ID',
              accessor: 'transactionId',
              disableSortBy: true,
              Cell: props => (
                !props.row.original.skeleton ?
                  <div className="space-y-1 my-1">
                    <div className="flex items-center space-x-1">
                      <Link href={`/tx/${props.value}`}>
                        <a className="uppercase text-blue-600 dark:text-white font-semibold">
                          {ellipseAddress(props.value, 8)}
                        </a>
                      </Link>
                      <Copy size={14} text={props.value} />
                    </div>
                    {props.row.original.txs?.filter(t => t.id && (t.chain_id === props.row.original.sendingChain?.chain_id || t.chain_id === props.row.original.receivingChain?.chain_id)).map((t, i) => {
                      const chain = t.chain_id === props.row.original.sendingChain?.chain_id ? props.row.original.sendingChain : props.row.original.receivingChain

                      return (
                        <div key={i} className="flex items-center space-x-1">
                          <Copy
                            size={12}
                            text={t.id}
                            copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-light">
                              {ellipseAddress(t.id, 8)}
                            </span>}
                          />
                          {chain?.explorer?.url && (
                            <a
                              href={`${chain.explorer.url}${chain.explorer.transaction_path?.replace('{tx}', t.id)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {chain.explorer.icon ?
                                <Image
                                  src={chain.explorer.icon}
                                  alt=""
                                  className="w-3.5 h-3.5 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={16} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                        </div>
                      )
                    })}
                  </div>
                  :
                  <div className="flex flex-col space-y-2 my-1">
                    <div className="skeleton w-32 h-5" />
                    <div className="skeleton w-28 h-4" />
                  </div>
              ),
            },
            {
              Header: 'Status',
              accessor: 'crosschain_status',
              disableSortBy: true,
              Cell: props => (
                !props.row.original.skeleton ?
                  <Link href={`/tx/${props.row.original.transactionId}`}>
                    <a className={`max-w-min h-6 bg-gray-100 dark:bg-${props.value === 'Fulfilled' ? 'green-600' : props.value === 'Fulfilling' ? 'green-400' : props.value === 'Prepared' ? 'yellow-500' : props.value === 'Preparing' ? 'blue-600' : 'red-700'} rounded-lg flex items-center space-x-1 my-1 py-1 px-1.5`}>
                      {props.value === 'Fulfilled' ?
                        <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                        :
                        props.value === 'Fulfilling' ?
                          <Puff color={theme === 'dark' ? 'white' : '#22C55E'} width="14" height="14" />
                          :
                          props.value === 'Prepared' ?
                            <FaRegCheckCircle size={14} className="text-yellow-500 dark:text-white" />
                            :
                            props.value === 'Preparing' ?
                              <TailSpin color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                              :
                              <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                      }
                      <span className="uppercase text-xs font-semibold">{props.value}</span>
                    </a>
                  </Link>
                  :
                  <div className="skeleton w-20 h-6 my-1" />
              ),
            },
            {
              Header: 'Initiator',
              accessor: 'sendingAddress',
              disableSortBy: true,
              Cell: props => (
                !props.row.original.skeleton ?
                  props.value ?
                    <div className="min-w-max space-y-1.5 my-1">
                      <div className="flex items-center space-x-1">
                        <Link href={`/address/${props.value}`}>
                          <a className={`text-blue-600 dark:text-white text-xs ${ens_data?.[props.value?.toLowerCase()]?.name ? 'font-semibold' : ''}`}>
                            {ellipseAddress(ens_data?.[props.value?.toLowerCase()]?.name || props.value, 8)}
                          </a>
                        </Link>
                        <Copy size={14} text={props.value} />
                        {props.row.original.sendingChain?.explorer?.url && (
                          <a
                            href={`${props.row.original.sendingChain.explorer.url}${props.row.original.sendingChain.explorer.address_path?.replace('{address}', props.value)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            {props.row.original.sendingChain.explorer.icon ?
                              <Image
                                src={props.row.original.sendingChain.explorer.icon}
                                alt=""
                                className="w-3.5 h-3.5 rounded-full opacity-60 hover:opacity-100"
                              />
                              :
                              <TiArrowRight size={14} className="transform -rotate-45" />
                            }
                          </a>
                        )}
                      </div>
                      {props.row.original.sendingChain && (
                        <div className="flex items-center space-x-2">
                          <Image
                            src={props.row.original.sendingChain.image}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-gray-400 dark:text-gray-600 text-xs">{chainTitle(props.row.original.sendingChain)}</span>
                        </div>
                      )}
                    </div>
                    :
                    <div className="text-gray-400 dark:text-gray-600 font-light my-1">Unknown</div>
                  :
                  <div className="flex flex-col space-y-2.5 my-1">
                    <div className="skeleton w-28 h-5" />
                    <div className="skeleton w-20 h-4" />
                  </div>
              ),
            },
            {
              Header: 'Receiver',
              accessor: 'receivingAddress',
              disableSortBy: true,
              Cell: props => (
                !props.row.original.skeleton ?
                  props.value ?
                    <div className="min-w-max space-y-1.5 my-1">
                      <div className="flex items-center space-x-1">
                        <Link href={`/address/${props.value}`}>
                          <a className={`text-blue-600 dark:text-white text-xs ${ens_data?.[props.value?.toLowerCase()]?.name ? 'font-semibold' : ''}`}>
                            {ellipseAddress(ens_data?.[props.value?.toLowerCase()]?.name || props.value, 8)}
                          </a>
                        </Link>
                        <Copy size={14} text={props.value} />
                        {props.row.original.receivingChain?.explorer?.url && (
                          <a
                            href={`${props.row.original.receivingChain.explorer.url}${props.row.original.receivingChain.explorer.address_path?.replace('{address}', props.value)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            {props.row.original.receivingChain.explorer.icon ?
                              <Image
                                src={props.row.original.receivingChain.explorer.icon}
                                alt=""
                                className="w-3.5 h-3.5 rounded-full opacity-60 hover:opacity-100"
                              />
                              :
                              <TiArrowRight size={14} className="transform -rotate-45" />
                            }
                          </a>
                        )}
                      </div>
                      {props.row.original.receivingChain && (
                        <div className="flex items-center space-x-2">
                          <Image
                            src={props.row.original.receivingChain.image}
                            alt=""
                            className="w-5 h-5 rounded-full"
                          />
                          <span className="text-gray-400 dark:text-gray-600 text-xs">{chainTitle(props.row.original.receivingChain)}</span>
                        </div>
                      )}
                    </div>
                    :
                    <div className="text-gray-400 dark:text-gray-600 font-light my-1">Unknown</div>
                  :
                  <div className="flex flex-col space-y-2.5 my-1">
                    <div className="skeleton w-28 h-5" />
                    <div className="skeleton w-20 h-4" />
                  </div>
              ),
            },
            {
              Header: 'Asset',
              accessor: 'receiving_amount',
              disableSortBy: true,
              Cell: props => {
                const addSendingTokenToMetaMaskButton = props.row.original.sendingChain && props.row.original.sendingAsset && props.row.original.sendingAssetId !== constants.AddressZero && (
                  <button
                    onClick={() => addTokenToMetaMask(props.row.original.sendingChain.chain_id, { ...props.row.original.sendingAsset })}
                    className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded flex items-center justify-center py-1 px-1.5"
                  >
                    <Image
                      src="/logos/wallets/metamask.png"
                      alt=""
                      className="w-3.5 h-3.5"
                    />
                  </button>
                )

                const addReceivingTokenToMetaMaskButton = props.row.original.receivingChain && props.row.original.receivingAsset && props.row.original.receivingAssetId !== constants.AddressZero && (
                  <button
                    onClick={() => addTokenToMetaMask(props.row.original.receivingChain.chain_id, { ...props.row.original.receivingAsset })}
                    className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded flex items-center justify-center py-1 px-1.5"
                  >
                    <Image
                      src="/logos/wallets/metamask.png"
                      alt=""
                      className="w-3.5 h-3.5"
                    />
                  </button>
                )

                const sendingAmount = props.row.original.sending_amount, recevingAmount = props.value

                return !props.row.original.skeleton ?
                  <div className="min-w-max flex items-center justify-between space-x-2">
                    <div className="flex flex-col items-start space-y-1.5">
                      {props.row.original.sendingAssetId && (
                        <div className="flex items-center">
                          <Image
                            src={props.row.original.sendingAsset?.image}
                            alt=""
                            className="w-5 h-5 rounded-full mr-2"
                          />
                          {props.row.original.sendingAsset?.symbol ?
                            <div className="flex items-center space-x-1">
                              <span className="font-semibold">{props.row.original.sendingAsset.symbol}</span>
                              {/*<Copy size={14} text={props.row.original.sendingAssetId} />*/}
                            </div>
                            :
                            <Copy
                              size={12}
                              text={props.row.original.sendingAssetId}
                              copyTitle={<span className="text-gray-400 dark:text-gray-600 text-2xs">
                                {ellipseAddress(props.row.original.sendingAssetId, 5)}
                              </span>}
                            />
                          }
                          {props.row.original.sendingChain?.explorer?.url && (
                            <a
                              href={`${props.row.original.sendingChain.explorer.url}${props.row.original.sendingChain.explorer[`contract${props.row.original.sendingAssetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', props.row.original.sendingAssetId)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white mb-0.5 ml-1"
                            >
                              {props.row.original.sendingChain.explorer.icon ?
                                <Image
                                  src={props.row.original.sendingChain.explorer.icon}
                                  alt=""
                                  className="w-3.5 h-3.5 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={12} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                          {addSendingTokenToMetaMaskButton && (
                            <div className="ml-2">
                              <Popover
                                placement="top"
                                title={<span className="normal-case text-3xs">Add token</span>}
                                content={<div className="w-32 text-3xs">Add <span className="font-semibold">{props.row.original.sendingAsset.symbol}</span> to MetaMask</div>}
                                titleClassName="py-0.5"
                                contentClassName="py-1.5"
                              >
                                {addSendingTokenToMetaMaskButton}
                              </Popover>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="font-mono leading-4 text-2xs">
                        {typeof sendingAmount === 'number' ?
                          <>
                            <span className="font-semibold mr-1">
                              {numberFormat(sendingAmount, '0,0.000000')}
                            </span>
                            <span className="text-gray-400 dark:text-gray-600 font-medium">{props.row.original.sendingAsset?.symbol}</span>
                          </>
                          :
                          <span className="text-gray-400 dark:text-gray-600">n/a</span>
                        }
                      </div>
                    </div>
                    <div className="flex flex-col items-center">
                      <GoCode size={20} />
                    </div>
                    <div className="flex flex-col items-end space-y-1.5">
                      {props.row.original.receivingAssetId && (
                        <div className="flex items-center">
                          <Image
                            src={props.row.original.receivingAsset?.image}
                            alt=""
                            className="w-5 h-5 rounded-full mr-2"
                          />
                          {props.row.original.receivingAsset?.symbol ?
                            <div className="flex items-center space-x-1">
                              <span className="font-semibold">{props.row.original.receivingAsset.symbol}</span>
                              {/*<Copy size={14} text={props.row.original.receivingAssetId} />*/}
                            </div>
                            :
                            <Copy
                              size={12}
                              text={props.row.original.receivingAssetId}
                              copyTitle={<span className="text-gray-400 dark:text-gray-600 text-2xs">
                                {ellipseAddress(props.row.original.receivingAssetId, 5)}
                              </span>}
                            />
                          }
                          {props.row.original.receivingChain?.explorer?.url && (
                            <a
                              href={`${props.row.original.receivingChain.explorer.url}${props.row.original.receivingChain.explorer[`contract${props.row.original.receivingAssetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', props.row.original.receivingAssetId)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white mb-0.5 ml-1"
                            >
                              {props.row.original.receivingChain.explorer.icon ?
                                <Image
                                  src={props.row.original.receivingChain.explorer.icon}
                                  alt=""
                                  className="w-3.5 h-3.5 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={12} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                          {addReceivingTokenToMetaMaskButton && (
                            <div className="ml-2">
                              <Popover
                                placement="top"
                                title={<span className="normal-case text-3xs">Add token</span>}
                                content={<div className="w-32 text-3xs">Add <span className="font-semibold">{props.row.original.receivingAsset.symbol}</span> to MetaMask</div>}
                                titleClassName="py-0.5"
                                contentClassName="py-1.5"
                              >
                                {addReceivingTokenToMetaMaskButton}
                              </Popover>
                            </div>
                          )}
                        </div>
                      )}
                      <div className="font-mono leading-4 text-2xs">
                        {typeof recevingAmount === 'number' ?
                          <>
                            <span className="font-semibold mr-1">
                              {numberFormat(recevingAmount, '0,0.000000')}
                            </span>
                            <span className="text-gray-400 dark:text-gray-600 font-medium">{props.row.original.receivingAsset?.symbol}</span>
                          </>
                          :
                          <span className="text-gray-400 dark:text-gray-600">n/a</span>
                        }
                      </div>
                    </div>
                  </div>
                  :
                  <div className="flex flex-col items-end space-y-2.5 my-1">
                    <div className="skeleton w-28 h-5" />
                    <div className="skeleton w-28 h-4" />
                  </div>
              },
              headerClassName: 'justify-end text-right',
            },
            {
              Header: 'Time',
              accessor: 'preparedTimestamp',
              disableSortBy: true,
              Cell: props => (
                !props.row.original.skeleton ?
                  <div className="text-right my-1">
                    <span className="text-gray-400 dark:text-gray-600">
                      {Number(moment().diff(moment(props.value), 'second')) > 59 ?
                        moment(props.value).fromNow()
                        :
                        <>{moment().diff(moment(props.value), 'second')}s ago</>
                      }
                    </span>
                  </div>
                  :
                  <div className="skeleton w-20 h-5 my-1 ml-auto" />
              ),
              headerClassName: 'justify-end text-right',
            },
          ]}
          data={txs ?
            (filteredTxs || []).map((t, i) => { return { ...t, i } })
            :
            [...Array(10).keys()].map(i => { return { i, skeleton: true } })
          }
          noPagination={!txs || filteredTxs?.length <= 10 ? true : false}
          defaultPageSize={address || blockchain_id ? 25 : 100}
          className={`min-h-full ${className}`}
        />
        {txs && !(filteredTxs?.length > 0) && (
          <div className="bg-white dark:bg-gray-900 rounded-xl text-gray-300 dark:text-gray-500 text-base font-medium italic text-center m-2 py-2">
            No Transactions
          </div>
        )}
      </div>
    </>
  )
}