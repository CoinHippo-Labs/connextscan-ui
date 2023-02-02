import dynamic from 'next/dynamic'
import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import { NxtpSdk } from '@connext/nxtp-sdk'
import { decodeAuctionBid } from '@connext/nxtp-utils'
import Web3 from 'web3'
import { providers, constants, utils } from 'ethers'
import BigNumber from 'bignumber.js'
import { Oval, TailSpin } from 'react-loader-spinner'
import HeadShake from 'react-reveal/HeadShake'
import Switch from 'react-switch'
import { MdOutlineRouter, MdInfoOutline } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'
import { FaCheckCircle, FaRegCheckCircle, FaClock, FaTimesCircle, FaQuestion } from 'react-icons/fa'
import { BsFileEarmarkX } from 'react-icons/bs'
import { IoWalletOutline } from 'react-icons/io5'
import { GoCode } from 'react-icons/go'

import Copy from '../copy'
import Widget from '../widget'
import Modal from '../modals/modal-info'
import ModalConfirm from '../modals/modal-confirm'
import Notification from '../notifications'
import Popover from '../popover'
import Alert from '../alerts'
import Image from '../image'
import Wallet from '../wallet'

import { transactions as getTransactions } from '../../lib/api/subgraph'
import { tokens as getTokens } from '../../lib/api/tokens'
import { domains, getENS } from '../../lib/api/ens'
import { chainTitle } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { numberFormat, ellipseAddress, convertToJson, paramsToObject } from '../../lib/utils'

import { TOKENS_DATA, ENS_DATA, WALLET_DATA } from '../../reducers/types'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function Transaction() {
  const dispatch = useDispatch()
  const { preferences, chains, tokens, ens, rpcs, sdk, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, tokens: state.tokens, ens: state.ens, rpcs: state.rpcs, sdk: state.sdk, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { tokens_data } = { ...tokens }
  const { ens_data } = { ...ens }
  const { rpcs_data } = { ...rpcs }
  const { sdk_data } = { ...sdk }
  const { wallet_data } = { ...wallet }
  const { provider, web3_provider, signer, chain_id, address, default_chain_id } = { ...wallet_data }

  const router = useRouter()
  const { asPath, query } = { ...router }
  const { tx, source } = { ...query }

  const [transaction, setTransaction] = useState(null)
  const [decodedBid, setDecodedBid] = useState(null)
  const [decoded, setDecoded] = useState(false)
  const [routerBalance, setRouterBalance] = useState(null)
  const [transfering, setTransfering] = useState(null)
  const [transferResponse, setTransferResponse] = useState(null)
  const [web3, setWeb3] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [addTokenData, setAddTokenData] = useState(null)

  const { sendingTx, receivingTx } = { ...transaction?.data }
  const generalTx = _.last([sendingTx, receivingTx].filter(t => t))

  useEffect(() => {
    if (!web3) {
      setWeb3(new Web3(Web3.givenProvider))
    }
    else {
      try {
        web3.currentProvider._handleChainChanged = async e => {
          try {
            setChainId(Web3.utils.hexToNumber(e?.chainId))

            const web3Provider = new providers.Web3Provider(provider)
            const signer = web3Provider.getSigner()
            const address = await signer.getAddress()

            dispatch({
              type: WALLET_DATA,
              value: {
                web3_provider: web3Provider,
                signer,
                chain_id: Web3.utils.hexToNumber(e?.chainId),
                address,
              },
            })
          } catch (error) {}
        }
      } catch (error) {}
    }
  }, [web3, provider])

  useEffect(() => {
    if (addTokenData?.chain_id === chainId && addTokenData?.contract) {
      addTokenToMetaMask(addTokenData.chain_id, addTokenData.contract)
    }
  }, [chainId, addTokenData])

  useEffect(() => {
    const controller = new AbortController()
    const query = paramsToObject(asPath?.indexOf('?') > -1 && asPath?.substring(asPath.indexOf('?') + 1))
    const search = (['search'].includes(source) || ['search'].includes(query?.source))
    const getData = async is_interval => {
      if (asPath && tx && chains_data && sdk_data) {
        let data, tokenContracts = _.cloneDeep(tokens_data), transactionId

        for (let i = 0; i < chains_data.length; i++) {
          if (!controller.signal.aborted) {
            const chain = chains_data[i]

            if (!chain?.disabled && chain?.chain_id) {
              if (transaction?.tx !== tx || [transaction?.data?.sendingTx?.sendingChainId, transaction?.data?.sendingTx?.receivingChainId, transaction?.data?.receivingTx?.sendingChainId, transaction?.data?.receivingTx?.receivingChainId].includes(chain.chain_id)) {
                let response

                if (!controller.signal.aborted) {
                  response = await getTransactions(sdk_data, chain.chain_id, tx, null, chains_data, tokenContracts)

                  if (!(response?.data?.[0]) && search) {
                    const txHashFields = ['prepareTransactionHash', 'fulfillTransactionHash', 'cancelTransactionHash']

                    for (let j = 0; j < txHashFields.length; j++) {
                      const _response = await getTransactions(sdk_data, chain.chain_id, null, { where: `{ ${txHashFields[j]}: "${tx.toLowerCase()}" }`, size: 1 }, chains_data, tokens_data)

                      if (_response?.data?.[0]) {
                        const _data = _response.data[0]

                        if (txHashFields.map(f => _data[f]).includes(tx.toLowerCase()) && _data.transactionId) {
                          transactionId = _data.transactionId.toLowerCase()
                          router.push(`/tx/${_data.transactionId.toLowerCase()}`)
                          break
                        }
                      }
                    }
                  }

                  if (!controller.signal.aborted) {
                    if (response?.data?.[0]) {
                      let _data = response.data[0]

                      if (_data.sendingChainId && _data.sendingAssetId && !(tokenContracts?.findIndex(t => t?.chain_id === _data.sendingChainId && t.contract_address === _data.sendingAssetId?.toLowerCase()) > -1)) {
                        const responseTokens = await getTokens({ chain_id: _data.sendingChainId, address: _data.sendingAssetId })

                        tokenContracts = _.uniqBy(_.concat(tokenContracts || [], responseTokens?.data?.map(t => { return { ...t, id: `${_data.sendingChainId}_${t.contract_address}` } }) || []), 'id')
                      }
                      if (_data.receivingChainId && _data.receivingAssetId && !(tokenContracts?.findIndex(t => t?.chain_id === _data.receivingChainId && t.contract_address === _data.receivingAssetId?.toLowerCase()) > -1)) {
                        const responseTokens = await getTokens({ chain_id: _data.receivingChainId, address: _data.receivingAssetId })
                        tokenContracts = _.uniqBy(_.concat(tokenContracts || [], responseTokens?.data?.map(t => { return { ...t, id: `${_data.receivingChainId}_${t.contract_address}` } }) || []), 'id')
                      }

                      _data = {
                        ..._data,
                        sendingAsset: _data.sendingAsset || tokenContracts?.find(t => t?.chain_id === _data.sendingChainId && t?.contract_address === _data.sendingAssetId?.toLowerCase()),
                        receivingAsset: _data.receivingAsset || tokenContracts?.find(t => t?.chain_id === _data.receivingChainId && t?.contract_address === _data.receivingAssetId?.toLowerCase()),
                      }
                      _data = {
                        ..._data,
                        sending_amount: _data.sending_amount || (_data.sendingChainId === chain.chain_id && _data.sendingAsset?.contract_decimals && BigNumber(_data.amount).shiftedBy(-_data.sendingAsset.contract_decimals).toNumber()),
                        receiving_amount: _data.receiving_amount || (_data.receivingChainId === chain.chain_id && _data.receivingAsset?.contract_decimals && BigNumber(_data.amount).shiftedBy(-_data.receivingAsset.contract_decimals).toNumber()),
                      }
                      _data = {
                        ..._data,
                        sending_value: typeof _data.sendingAsset?.price === 'number' && typeof _data?.sending_amount === 'number' && (_data.sendingAsset.price * _data.sending_amount),
                        receiving_value: typeof _data.receivingAsset?.price === 'number' && typeof _data?.receiving_amount === 'number' && (_data.receivingAsset.price * _data.receiving_amount),
                      }
                      data = {
                        ...data,
                        [`${_data.chainId === _data.sendingChainId ? 'sendingTx' : 'receivingTx'}`]: { ..._data },
                      }

                      const next_chain = chains_data.find(c => c?.chain_id === (_data.chainId === _data.sendingChainId ? _data.receivingChainId : _data.sendingChainId))

                      if (!controller.signal.aborted) {
                        if (next_chain?.chain_id) {
                          response = await getTransactions(sdk_data, next_chain.chain_id, tx, null, chains_data, tokenContracts)

                          if (response?.data?.[0]) {
                            _data = response.data[0]

                            if (_data.sendingChainId && _data.sendingAssetId && tokenContracts?.findIndex(t => t?.chain_id === _data.sendingChainId && t.contract_address === _data.sendingAssetId?.toLowerCase()) < 0) {
                              const responseTokens = await getTokens({ chain_id: _data.sendingChainId, address: _data.sendingAssetId })
                              tokenContracts = _.uniqBy(_.concat(tokenContracts || [], responseTokens?.data?.map(t => { return { ...t, id: `${_data.sendingChainId}_${t.contract_address}` } }) || []), 'id')
                            }
                            if (_data.receivingChainId && _data.receivingAssetId && tokenContracts?.findIndex(t => t?.chain_id === _data.receivingChainId && t.contract_address === _data.receivingAssetId?.toLowerCase()) < 0) {
                              const responseTokens = await getTokens({ chain_id: _data.receivingChainId, address: _data.receivingAssetId })
                              tokenContracts = _.uniqBy(_.concat(tokenContracts || [], responseTokens?.data?.map(t => { return { ...t, id: `${_data.receivingChainId}_${t.contract_address}` } }) || []), 'id')
                            }

                            _data = {
                              ..._data,
                              sendingAsset: _data.sendingAsset || tokenContracts?.find(t => t?.chain_id === _data.sendingChainId && t?.contract_address === _data.sendingAssetId?.toLowerCase()),
                              receivingAsset: _data.receivingAsset || tokenContracts?.find(t => t?.chain_id === _data.receivingChainId && t?.contract_address === _data.receivingAssetId?.toLowerCase()),
                            }
                            _data = {
                              ..._data,
                              sending_amount: _data.sending_amount || (_data.sendingChainId === next_chain.chain_id && _data.sendingAsset?.contract_decimals && BigNumber(_data.amount).shiftedBy(-_data.sendingAsset.contract_decimals).toNumber()),
                              receiving_amount: _data.receiving_amount || (_data.receivingChainId === next_chain.chain_id && _data.receivingAsset?.contract_decimals && BigNumber(_data.amount).shiftedBy(-_data.receivingAsset.contract_decimals).toNumber()),
                            }
                            _data = {
                              ..._data,
                              sending_value: typeof _data.sendingAsset?.price === 'number' && typeof _data?.sending_amount === 'number' && (_data.sendingAsset.price * _data.sending_amount),
                              receiving_value: typeof _data.receivingAsset?.price === 'number' && typeof _data?.receiving_amount === 'number' && (_data.receivingAsset.price * _data.receiving_amount),
                            }
                            data = {
                              ...data,
                              [`${_data.chainId === _data.sendingChainId ? 'sendingTx' : 'receivingTx'}`]: { ..._data },
                            }
                          }
                        }
                      }
                      break
                    }
                  }
                }
              }
            }
          }
        }

        if (!controller.signal.aborted) {
          if (search) {
            router.push(`/tx/${transactionId || tx}`)
          }

          setTransaction({ data, tx })

          if (tokenContracts) {
            dispatch({
              type: TOKENS_DATA,
              value: tokenContracts,
            })
          }

          if (!is_interval && data) {
            const evmAddresses = _.uniq([data.sendingTx?.initiator, data.sendingTx?.user?.id, data.sendingTx?.receivingAddress, data.receivingTx?.initiator, data.receivingTx?.user?.id, data.receivingTx?.receivingAddress].filter(id => id))
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
    }

    if (transaction?.tx !== tx) {
      if (search) {
        setTransaction(null)
      }

      getData()
    }

    const interval = setInterval(() => getData(true), 20 * 1000)
    return () => {
      controller?.abort()
      clearInterval(interval)
    }
  }, [tx, source, sdk_data])

  useEffect(() => {
    if (generalTx && !decodedBid && convertToJson(decodeAuctionBid(generalTx.encodedBid))) {
      const ReactJson = typeof window !== 'undefined' && dynamic(import('react-json-view'))

      setDecodedBid(<ReactJson src={convertToJson(decodeAuctionBid(generalTx.encodedBid))} collapsed={false} theme={theme === 'dark' ? 'shapeshifter' : 'rjv-default'} />)
    }
  }, [generalTx, decodedBid])

  useEffect(() => {
    const getData = async () => {
      if (chains_data && generalTx?.router?.id && !receivingTx && generalTx.receivingChainId && rpcs_data?.[generalTx.receivingChainId]) {
        const chain = chains_data.find(c => c?.chain_id === generalTx.receivingChainId)

        const decimals = chain?.provider_params?.[0]?.nativeCurrency?.decimals
        let _balance = await rpcs_data[generalTx.receivingChainId].getBalance(generalTx.router.id)
        try {
          _balance = BigNumber(_balance.toString()).shiftedBy(-(decimals || 18)).toNumber()
        } catch (error) {}

        setRouterBalance(_balance)
      }
      else {
        setRouterBalance(null)
      }
    }

    getData()
  }, [transaction, rpcs_data])

  const newNxtpSdk = async () => {
    let sdk

    if (chains_data && signer) {
      const chainConfig = ['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK) ?
        { 1: { providers: ['https://rpc.ankr.com/eth', 'https://cloudflare-eth.com'] } }
        :
        {}

      for (let i = 0; i < chains_data.length; i++) {
        const chain = chains_data[i]

        chainConfig[chain?.chain_id] = {
          providers: chain?.provider_params?.[0]?.rpcUrls?.filter(rpc => rpc && !rpc.startsWith('wss://') && !rpc.startsWith('ws://')) || [],
        }

        // if ([42161].includes(chain?.chain_id)) {
        //   chainConfig[chain?.chain_id].gelatoOracle = false;
        // }
      }

      sdk = await NxtpSdk.create({ chainConfig, signer, skipPolling: true })
    }

    return sdk
  }

  const fulfill = async txData => {
    setTransfering('fulfill')
    setTransferResponse(null)

    if (signer && txData) {
      try {
        setTransferResponse({ status: 'pending', message: 'Wait for Claiming' })

        const sdk = await newNxtpSdk()
        if (sdk) {
          const response = await sdk.fulfillTransfer({
            txData: {
              ...txData,
              user: txData.user?.id,
              router: txData.router?.id,
              preparedBlockNumber: Number(txData.preparedBlockNumber),
              expiry: txData.expiry / 1000,
            },
            encryptedCallData: txData.encryptedCallData,
            encodedBid: txData.encodedBid,
            bidSignature: txData.bidSignature,
          }, 0, false)

          setTransferResponse({ status: 'pending', message: 'Wait for Claiming Confirmation', tx_hash: response?.hash || response?.transactionHash, ...response })
        }
      } catch (error) {
        setTransferResponse({ status: 'failed', message: error?.reason || error?.data?.message || error?.message })
      }
    }

    setTransfering(false)
  }

  const cancel = async (txData, chain_id) => {
    setTransfering('cancel')
    setTransferResponse(null)

    if (signer && txData) {
      try {
        const signature = '0x'
        const sdk = await newNxtpSdk()
        if (sdk) {
          const response = await sdk.cancel({
            txData: {
              ...txData,
              user: txData.user?.id,
              router: txData.router?.id,
              preparedBlockNumber: Number(txData.preparedBlockNumber),
              expiry: txData.expiry / 1000,
            },
            signature,
          }, chain_id)

          setTransferResponse({ status: 'pending', message: 'Wait for Cancellation Confirmation', tx_hash: response?.hash, ...response })
        }
      } catch (error) {
        setTransferResponse({ status: 'failed', message: error?.reason || error?.data?.message || error?.message })
      }
    }

    setTransfering(false)
  }

  const addTokenToMetaMask = async (chain_id, contract) => {
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
  }

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

  const canCancelSendingTx = sendingTx?.status === 'Prepared' && moment().valueOf() >= sendingTx.expiry && !(transferResponse && !['failed'].includes(transferResponse.status))
  const canDoAction = !canCancelSendingTx && receivingTx?.status === 'Prepared' && !(transferResponse && !['failed'].includes(transferResponse.status))
  const canFulfill = canDoAction && moment().valueOf() < receivingTx.expiry
  const actionButtons = []
  let mustSwitchNetwork = false

  if (canCancelSendingTx || canDoAction) {
    if (web3_provider) {
      if (![canCancelSendingTx ? sendingTx?.user?.id?.toLowerCase() : [receivingTx?.user?.id?.toLowerCase()]].flatMap(a => a).includes(address?.toLowerCase())) {
        actionButtons.push(
          <span key={actionButtons.length} className="min-w-max flex flex-col text-gray-600 dark:text-gray-400 text-xs font-normal text-right">
            <span>address not match.</span>
            <span className="flex items-center">(Your<span className="hidden sm:block ml-1">connected addr</span>: {ellipseAddress(ens_data?.[address?.toLowerCase()]?.name, 10) || ellipseAddress(address?.toLowerCase(), 6)})</span>
          </span>
        )
      }
      else {
        if (typeof chain_id === 'number' && chain_id !== (canCancelSendingTx ? sendingTx?.sendingChainId : receivingTx?.receivingChainId)) {
          mustSwitchNetwork = true
        }
        else {
          if (transfering) {
            actionButtons.push(
              <div key={actionButtons.length} className="w-32 sm:w-40 space-y-1">
                <div className="w-full flex items-center justify-center text-blue-600 dark:text-blue-500 space-x-1">
                  <span className="font-semibold">Waiting to Sign</span>
                  <TailSpin color={theme === 'dark' ? '#3B82F6' : '#2563EB'} width="16" height="16" />
                </div>
              </div>
            )
          }
          else {
            if (canCancelSendingTx) {
              actionButtons.push(
                <ModalConfirm
                  key={actionButtons.length}
                  buttonTitle={<>
                    {transfering === 'cancel' && (
                      <Oval color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" className="mb-0.5" />
                    )}
                    <span>Cancel</span>
                  </>}
                  buttonClassName={`bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 ${transfering ? 'pointer-events-none' : ''} rounded-2xl flex items-center font-semibold space-x-1.5 py-1 sm:py-1.5 px-2 sm:px-3`}
                  title="Cancel Transaction"
                  body={<div className="flex flex-col space-y-2 sm:space-y-3 mt-2 -mb-2">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 xl:space-x-2">
                      <div className="flex items-center text-gray-400 dark:text-gray-600">
                        Address
                        <span className="hidden sm:block">:</span>
                      </div>
                      {generalTx && (
                        <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                          {ens_data?.[generalTx.receivingAddress?.toLowerCase()]?.name && (
                            <Image
                              src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data?.[generalTx.receivingAddress.toLowerCase()].name}`}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                          )}
                          <Link href={`/address/${generalTx.receivingAddress}`}>
                            <a className="text-gray-400 dark:text-gray-200 text-base sm:text-xs xl:text-base font-medium">
                              {ellipseAddress(ens_data?.[generalTx.receivingAddress?.toLowerCase()]?.name || generalTx.receivingAddress?.toLowerCase(), 10)}
                            </a>
                          </Link>
                          <Copy size={18} text={generalTx.receivingAddress} />
                          {generalTx.receivingChain?.explorer?.url && (
                            <a
                              href={`${generalTx.receivingChain.explorer.url}${generalTx.receivingChain.explorer.address_path?.replace('{address}', generalTx.receivingAddress)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-600 dark:text-white"
                            >
                              {generalTx.receivingChain.explorer.icon ?
                                <Image
                                  src={generalTx.receivingChain.explorer.icon}
                                  alt=""
                                  className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                                />
                                :
                                <TiArrowRight size={20} className="transform -rotate-45" />
                              }
                            </a>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 xl:space-x-2">
                      <div className="flex items-center text-gray-400 dark:text-gray-600">
                        Amount Sent
                        <span className="hidden sm:block">:</span>
                      </div>
                      {sendingTx?.sending_amount && (
                        <div className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-lg text-sm space-x-1 py-1 px-2">
                          <span className="font-mono font-semibold">{numberFormat(sendingTx.sending_amount, '0,0.00000000', true)}</span>
                          <span className="text-gray-600 dark:text-gray-400">{sendingTx.sendingAsset?.symbol || sendingTx.receivingAsset?.symbol}</span>
                        </div>
                      )}
                    </div>
                    {receivingTx && (
                      <>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 xl:space-x-2">
                          <div className="flex items-center text-gray-400 dark:text-gray-600">
                            Amount Received
                            <span className="hidden sm:block">:</span>
                          </div>
                          {receivingTx?.receiving_amount && (
                            <div className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-lg text-sm space-x-1 py-1 px-2">
                              <span className="font-mono font-semibold">{numberFormat(receivingTx.receiving_amount, '0,0.00000000', true)}</span>
                              <span className="text-gray-600 dark:text-gray-400">{receivingTx.receivingAsset?.symbol || receivingTx.sendingAsset?.symbol}</span>
                            </div>
                          )}
                        </div>
                        <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 xl:space-x-2">
                          <div className="flex items-center text-gray-400 dark:text-gray-600">
                            Total Fees Paid
                            <span className="hidden sm:block">:</span>
                          </div>
                          {receivingTx.receiving_amount && sendingTx?.sending_amount && (
                            <div className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-lg text-sm space-x-1 py-1 px-2">
                              <span className="font-mono font-semibold">{numberFormat(sendingTx.sending_amount - receivingTx.receiving_amount, '0,0.00000000', true)}</span>
                              <span className="text-gray-600 dark:text-gray-400">{receivingTx.receivingAsset?.symbol || receivingTx.sendingAsset?.symbol}</span>
                            </div>
                          )}
                        </div>
                      </>
                    )}
                    <div className="flex items-center space-x-2 mx-auto py-2">
                      {transaction ?
                        <Image
                          src={generalTx?.sendingChain?.image}
                          alt=""
                          className="w-6 sm:w-4 xl:w-6 h-6 sm:h-4 xl:h-6 rounded-full"
                        />
                        :
                        <div className="skeleton w-6 sm:w-4 xl:w-6 h-6 sm:h-4 xl:h-6" style={{ borderRadius: '100%' }} />
                      }
                      <Image
                        src="/logos/logo.png"
                        alt=""
                        className="w-6 sm:w-4 xl:w-6 h-6 sm:h-4 xl:h-6"
                      />
                      {transaction ?
                        <Image
                          src={generalTx?.receivingChain?.image}
                          alt=""
                          className="w-6 sm:w-4 xl:w-6 h-6 sm:h-4 xl:h-6 rounded-full"
                        />
                        :
                        <div className="skeleton w-6 sm:w-4 xl:w-6 h-6 sm:h-4 xl:h-6" style={{ borderRadius: '100%' }} />
                      }
                    </div>
                    <div>Do you want to cancel this transaction?</div>
                  </div>}
                  cancelButtonTitle="No"
                  confirmButtonTitle="Yes, cancel it"
                  onConfirm={() => cancel(canCancelSendingTx ? sendingTx : receivingTx, canCancelSendingTx ? generalTx?.sendingChainId : generalTx?.receivingChainId)}
                  modalClassName="max-w-sm"
                />
              )
            }

            if (canFulfill) {
              actionButtons.push(
                <HeadShake
                  key={actionButtons.length}
                  duration={1500}
                  forever
                >
                  <ModalConfirm
                    buttonTitle={<>
                      {transfering === 'fulfill' && (
                        <Oval color={theme === 'dark' ? 'white' : 'white'} width="16" height="16" className="mb-0.5" />
                      )}
                      <span>Claim</span>
                    </>}
                    buttonClassName={`bg-green-400 hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-500 ${transfering ? 'pointer-events-none' : ''} rounded-2xl flex items-center text-white font-semibold space-x-1.5 py-1 sm:py-1.5 px-2 sm:px-3`}
                    title="Fulfill Confirmation"
                    body={<div className="flex flex-col space-y-2 sm:space-y-3 mt-2 -mb-2">
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 xl:space-x-2">
                        <div className="flex items-center text-gray-400 dark:text-gray-600">
                          Address
                          <span className="hidden sm:block">:</span>
                        </div>
                        {generalTx && (
                          <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                            {ens_data?.[generalTx.receivingAddress?.toLowerCase()]?.name && (
                              <Image
                                src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data?.[generalTx.receivingAddress.toLowerCase()].name}`}
                                alt=""
                                className="w-6 h-6 rounded-full"
                              />
                            )}
                            <Link href={`/address/${generalTx.receivingAddress}`}>
                              <a className="text-gray-400 dark:text-gray-200 text-base sm:text-xs xl:text-base font-medium">
                                {ellipseAddress(ens_data?.[generalTx.receivingAddress?.toLowerCase()]?.name || generalTx.receivingAddress?.toLowerCase(), 10)}
                              </a>
                            </Link>
                            <Copy size={18} text={generalTx.receivingAddress} />
                            {generalTx.receivingChain?.explorer?.url && (
                              <a
                                href={`${generalTx.receivingChain.explorer.url}${generalTx.receivingChain.explorer.address_path?.replace('{address}', generalTx.receivingAddress)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
                              >
                                {generalTx.receivingChain.explorer.icon ?
                                  <Image
                                    src={generalTx.receivingChain.explorer.icon}
                                    alt=""
                                    className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                                  />
                                  :
                                  <TiArrowRight size={20} className="transform -rotate-45" />
                                }
                              </a>
                            )}
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 xl:space-x-2">
                        <div className="flex items-center text-gray-400 dark:text-gray-600">
                          Amount Sent
                          <span className="hidden sm:block">:</span>
                        </div>
                        {sendingTx?.sending_amount && (
                          <div className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-lg text-sm space-x-1 py-1 px-2">
                            <span className="font-mono font-semibold">{numberFormat(sendingTx.sending_amount, '0,0.00000000', true)}</span>
                            <span className="text-gray-600 dark:text-gray-400">{sendingTx.sendingAsset?.symbol || sendingTx.receivingAsset?.symbol}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 xl:space-x-2">
                        <div className="flex items-center text-gray-400 dark:text-gray-600">
                          Amount Received
                          <span className="hidden sm:block">:</span>
                        </div>
                        {receivingTx?.receiving_amount && (
                          <div className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-lg text-sm space-x-1 py-1 px-2">
                            <span className="font-mono font-semibold">{numberFormat(receivingTx.receiving_amount, '0,0.00000000', true)}</span>
                            <span className="text-gray-600 dark:text-gray-400">{receivingTx.receivingAsset?.symbol || receivingTx.sendingAsset?.symbol}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex flex-col sm:flex-row sm:items-center sm:space-x-1 xl:space-x-2">
                        <div className="flex items-center text-gray-400 dark:text-gray-600">
                          Total Fees Paid
                          <span className="hidden sm:block">:</span>
                        </div>
                        {receivingTx?.receiving_amount && sendingTx?.sending_amount && (
                          <div className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-lg text-sm space-x-1 py-1 px-2">
                            <span className="font-mono font-semibold">{numberFormat(sendingTx.sending_amount - receivingTx.receiving_amount, '0,0.00000000', true)}</span>
                            <span className="text-gray-600 dark:text-gray-400">{receivingTx.receivingAsset?.symbol || receivingTx.sendingAsset?.symbol}</span>
                          </div>
                        )}
                      </div>
                      <div className="flex items-center space-x-2 mx-auto py-2">
                        {transaction ?
                          <Image
                            src={generalTx?.sendingChain?.image}
                            alt=""
                            className="w-6 sm:w-4 xl:w-6 h-6 sm:h-4 xl:h-6 rounded-full"
                          />
                          :
                          <div className="skeleton w-6 sm:w-4 xl:w-6 h-6 sm:h-4 xl:h-6" style={{ borderRadius: '100%' }} />
                        }
                        <Image
                          src="/logos/logo.png"
                          alt=""
                          className="w-6 sm:w-4 xl:w-6 h-6 sm:h-4 xl:h-6"
                        />
                        {transaction ?
                          <Image
                            src={generalTx?.receivingChain?.image}
                            alt=""
                            className="w-6 sm:w-4 xl:w-6 h-6 sm:h-4 xl:h-6 rounded-full"
                          />
                          :
                          <div className="skeleton w-6 sm:w-4 xl:w-6 h-6 sm:h-4 xl:h-6" style={{ borderRadius: '100%' }} />
                        }
                      </div>
                      <div>Are you sure you want to fulfill?</div>
                    </div>}
                    cancelButtonTitle="No"
                    confirmButtonTitle="Yes"
                    onConfirm={() => fulfill(receivingTx)}
                    modalClassName="max-w-sm"
                  />
                </HeadShake>
              )
            }
          }
        }
      }
    }
  }
  else {
    if (transfering) {
      setTransfering(null)
    }
    if (transferResponse && receivingTx?.status !== 'Prepared') {
      setTransferResponse(null)
    }
  }

  const tipsButton = (canCancelSendingTx || canDoAction) && (
    <Modal
      buttonTitle={<MdInfoOutline size={24} className="stroke-current" />}
      buttonClassName="bg-white hover:bg-gray-100 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-full text-gray-600 dark:text-gray-400 p-1 sm:p-1.5"
      title={<div className="text-sm sm:text-lg text-left">Instructions to {canFulfill ? 'claim or ' : ''}cancel your transaction</div>}
      body={<div className="space-y-3">
        <div className="flex text-sm sm:text-base text-left space-x-2 my-1">
          <span>1.</span>
          <span>Connect your wallet with the sender address and the {canCancelSendingTx ? 'sender' : 'receiver'} network.</span>
        </div>
        <button
          className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 pointer-events-none rounded-lg text-white font-medium py-1 px-2"
          style={{ width: 'max-content' }}
        >
          <div className="flex items-center space-x-1.5">
            <span>Connect</span>
            <IoWalletOutline size={18} />
          </div>
        </button>
        <TiArrowRight size={24} className="transform rotate-90 mx-auto" />
        <div className="flex items-center justify-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
          <Copy
            size={18}
            text={canCancelSendingTx ? sendingTx?.user?.id : receivingTx?.user?.id}
            copyTitle={<span className="text-gray-400 dark:text-gray-200 text-base sm:text-xs xl:text-base font-medium">
              {ellipseAddress(ens_data?.[(canCancelSendingTx ? sendingTx?.user?.id : receivingTx?.user?.id)?.toLowerCase()]?.name, 10) || ellipseAddress((canCancelSendingTx ? sendingTx?.user?.id : receivingTx?.user?.id)?.toLowerCase(), 6)}
            </span>}
          />
          {canCancelSendingTx ?
            sendingTx?.sendingChain?.explorer?.url && (
              <a
                href={`${sendingTx.sendingChain.explorer.url}${sendingTx.sendingChain.explorer.address_path?.replace('{address}', sendingTx.user?.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-white"
              >
                {sendingTx.sendingChain.explorer.icon ?
                  <Image
                    src={sendingTx.sendingChain.explorer.icon}
                    alt=""
                    className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                  />
                  :
                  <TiArrowRight size={20} className="transform -rotate-45" />
                }
              </a>
            )
            :
            receivingTx?.receivingChain?.explorer?.url && (
              <a
                href={`${receivingTx.receivingChain.explorer.url}${receivingTx.receivingChain.explorer.address_path?.replace('{address}', receivingTx.user?.id)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-600 dark:text-white"
              >
                {receivingTx.receivingChain.explorer.icon ?
                  <Image
                    src={receivingTx.receivingChain.explorer.icon}
                    alt=""
                    className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                  />
                  :
                  <TiArrowRight size={20} className="transform -rotate-45" />
                }
              </a>
            )
          }
        </div>
        {canCancelSendingTx ?
          sendingTx?.sendingChain && (
            <div className="flex items-center justify-center space-x-2 mt-1.5">
              <Image
                src={sendingTx.sendingChain.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-gray-700 dark:text-gray-300 text-base font-semibold">{sendingTx.sendingChain.title || sendingTx.sendingChain.short_name}</span>
            </div>
          )
          :
          receivingTx?.receivingChain && (
            <div className="flex items-center justify-center space-x-2 mt-1.5">
              <Image
                src={receivingTx.receivingChain.image}
                alt=""
                className="w-6 h-6 rounded-full"
              />
              <span className="text-gray-700 dark:text-gray-300 text-base font-semibold">{receivingTx.receivingChain.title || receivingTx.receivingChain.short_name}</span>
            </div>
          )
        }
        <div className="flex text-gray-400 dark:text-gray-600 text-xs font-light text-left space-x-2 my-1">
          <span>If the address does not match, the dashboard will show 'Address not match' status. Likewise, if the network does not match, there will be a 'Wrong Network' status. Then you need to switch it to the correct one.</span>
        </div>
        <TiArrowRight size={24} className="transform rotate-90 mx-auto" />
        <div className="flex text-sm sm:text-base text-left space-x-2 mt-2 mb-1">
          <span>2.</span>
          <span>Once connected, the buttons will appear.</span>
        </div>
        <div className="flex text-gray-400 dark:text-gray-600 text-xs font-light text-left space-x-2 my-1">
          {canCancelSendingTx ?
            <span><span className="font-semibold">Cancel Button for Sender:</span> The button can be processed when the sender transaction is prepared and expired.</span>
            :
            <span><span className="font-semibold">Claim Button for Receiver:</span> The fulfill action can be processed when the receiver transaction is prepared and has not expired yet.</span>
          }
        </div>
        <div className="flex items-center justify-center space-x-1.5 sm:space-x-2">
          {canCancelSendingTx && (
            <button className="bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 pointer-events-none rounded-2xl flex items-center font-semibold space-x-1.5 py-1 sm:py-1.5 px-2 sm:px-3">
              <span>Cancel</span>
            </button>
          )}
          {canFulfill && (
            <button className="bg-green-400 hover:bg-green-500 dark:bg-green-600 dark:hover:bg-green-500 pointer-events-none rounded-2xl flex items-center text-white font-semibold space-x-1.5 py-1 sm:py-1.5 px-2 sm:px-3">
              <span>Claim</span>
            </button>
          )}
        </div>
        <div className="flex text-sm sm:text-base text-left space-x-2 mt-2 mb-1">
          <span>3.</span>
          <span>Click the actions you want to proceed with.</span>
        </div>
        <TiArrowRight size={24} className="transform rotate-90 mx-auto" />
        <div className="w-32 sm:w-40 space-y-1 mx-auto">
          <div className="w-full flex items-center justify-center text-blue-600 dark:text-blue-500 space-x-1">
            <span className="font-semibold">Waiting to Sign</span>
            <TailSpin color={theme === 'dark' ? '#3B82F6' : '#2563EB'} width="16" height="16" />
          </div>
        </div>
        <div className="flex text-sm sm:text-base text-left space-x-2 mt-2 mb-1">
          <span>4.</span>
          <span>Wait for the final result.</span>
        </div>
        <TiArrowRight size={24} className="transform rotate-90 mx-auto" />
        <Alert
          color="bg-blue-500 dark:bg-blue-600 text-white text-left"
          icon={<FaClock className="w-4 h-4 stroke-current mr-2" />}
          closeDisabled={true}
        >
          <span>Wait for Confirmation</span>
        </Alert>
      </div>}
      confirmButtonTitle="Ok"
    />
  )

  const addSendingTokenToMetaMaskButton = generalTx?.sendingAssetId !== constants.AddressZero && (
    <button
      onClick={() => addTokenToMetaMask(generalTx?.sendingChainId, { ...generalTx?.sendingAsset })}
      className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded flex items-center justify-center py-1 px-1.5"
    >
      <Image
        src="/logos/wallets/metamask.png"
        alt=""
        className="w-3.5 h-3.5"
      />
    </button>
  )
  const addReceivingTokenToMetaMaskButton = generalTx?.receivingAssetId !== constants.AddressZero && (
    <button
      onClick={() => addTokenToMetaMask(generalTx?.receivingChainId, { ...generalTx?.receivingAsset })}
      className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded flex items-center justify-center py-1 px-1.5"
    >
      <Image
        src="/logos/wallets/metamask.png"
        alt=""
        className="w-3.5 h-3.5"
      />
    </button>
  )

  const outOfGas = !receivingTx && typeof routerBalance === 'number' && routerBalance < Number(process.env.NEXT_PUBLIC_LOW_GAS_THRESHOLD)

  return (
    !transaction || transaction.data ?
      <>
        <div className="flex flex-col lg:flex-row space-y-4 lg:space-y-0 mt-4 xl:mt-6">
          {transferResponse && (
            <Notification
              hideButton={true}
              onClose={() => setTransferResponse(null)}
              outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
              innerClassNames={`${transferResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : transferResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 dark:bg-blue-700'} text-white`}
              animation="animate__animated animate__fadeInDown"
              icon={transferResponse.status === 'failed' ?
                <FaTimesCircle className="w-4 h-4 stroke-current mr-2" />
                :
                transferResponse.status === 'success' ?
                  <FaCheckCircle className="w-4 h-4 stroke-current mr-2" />
                  :
                  <FaClock className="w-4 h-4 stroke-current mr-2" />
              }
              content={<span className="flex flex-wrap items-center">
                <span className="mr-1.5">{transferResponse.message}</span>
                {transferResponse.status === 'pending' && (
                  <TailSpin color={theme === 'dark' ? 'white' : 'white'} width="16" height="16" className="mr-1.5" />
                )}
                {(canCancelSendingTx && transfering === 'cancel' ? generalTx?.sendingChain : generalTx?.receivingChain)?.explorer?.url && transferResponse.tx_hash && (
                  <a
                    href={`${(canCancelSendingTx && transfering === 'cancel' ? generalTx?.sendingChain : generalTx?.receivingChain).explorer.url}${(canCancelSendingTx && transfering === 'cancel' ? generalTx?.sendingChain : generalTx?.receivingChain).explorer.transaction_path?.replace('{tx}', transferResponse.tx_hash)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center font-semibold ml-1.5"
                  >
                    <span>View on {(canCancelSendingTx && transfering === 'cancel' ? generalTx?.sendingChain : generalTx?.receivingChain).explorer.name}</span>
                    <TiArrowRight size={20} className="transform -rotate-45" />
                  </a>
                )}
              </span>}
            />
          )}
          <Widget
            title={<div className="uppercase text-gray-400 dark:text-gray-600 text-sm sm:text-base font-semibold mb-2">Asset</div>}
            className="max-wax sm:max-w-min border-0 shadow-md rounded-2xl mr-4 xl:mr-6 px-5 lg:px-3 xl:px-5"
          >
            {transaction ?
              <>
                <div className="flex items-center justify-between space-x-3 lg:space-x-1.5 xl:space-x-3">
                  {generalTx?.sendingAssetId ?
                    <div className="flex flex-col">
                      {generalTx.sendingAsset && (
                        <div className="min-w-max h-6 flex items-center space-x-2">
                          <a
                            href={`${generalTx.sendingChain?.explorer?.url}${generalTx.sendingChain?.explorer?.[`contract${generalTx.sendingAssetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', generalTx.sendingAssetId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1.5"
                          >
                            <Image
                              src={generalTx.sendingAsset.image}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm font-semibold">{generalTx.sendingAsset.symbol || generalTx.sendingAsset.name}</span>
                          </a>
                          {addSendingTokenToMetaMaskButton && (
                            <Popover
                              placement="top"
                              title={<span className="normal-case text-3xs">Add token</span>}
                              content={<div className="w-32 text-3xs">Add <span className="font-semibold">{generalTx.sendingAsset.symbol}</span> to MetaMask</div>}
                              titleClassName="py-0.5"
                              contentClassName="py-1.5"
                            >
                              {addSendingTokenToMetaMaskButton}
                            </Popover>
                          )}
                        </div>
                      )}
                      <div className="min-w-max flex items-center space-x-1">
                        <Copy
                          size={14}
                          text={generalTx.sendingAssetId}
                          copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-medium">
                            {ellipseAddress(generalTx.sendingAssetId, 5)}
                          </span>}
                        />
                        {!generalTx.sendingAsset && generalTx.sendingChain?.explorer?.url && (
                          <a
                            href={`${generalTx.sendingChain.explorer.url}${generalTx.sendingChain.explorer[`contract${generalTx.sendingAssetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', generalTx.sendingAssetId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            {generalTx.sendingChain.explorer.icon ?
                              <Image
                                src={generalTx.sendingChain.explorer.icon}
                                alt=""
                                className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                              />
                              :
                              <TiArrowRight size={20} className="transform -rotate-45" />
                            }
                          </a>
                        )}
                      </div>
                    </div>
                    :
                    <span className="font-mono text-gray-400 dark:text-gray-600">n/a</span>
                  }
                  <GoCode size={24} />
                  {generalTx?.receivingAssetId ?
                    <div className="flex flex-col items-end">
                      {generalTx.receivingAsset && (
                        <div className="min-w-max h-6 flex items-center space-x-2">
                          <a
                            href={`${generalTx.receivingChain?.explorer?.url}${generalTx.receivingChain?.explorer?.[`contract${generalTx.receivingAssetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', generalTx.receivingAssetId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center space-x-1.5"
                          >
                            <Image
                              src={generalTx.receivingAsset.image}
                              alt=""
                              className="w-6 h-6 rounded-full"
                            />
                            <span className="text-sm font-semibold">{generalTx.receivingAsset.symbol || generalTx.receivingAsset.name}</span>
                          </a>
                          {addReceivingTokenToMetaMaskButton && (
                            <Popover
                              placement="top"
                              title={<span className="normal-case text-3xs">Add token</span>}
                              content={<div className="w-32 text-3xs">Add <span className="font-semibold">{generalTx.receivingAsset.symbol}</span> to MetaMask</div>}
                              titleClassName="py-0.5"
                              contentClassName="py-1.5"
                            >
                              {addReceivingTokenToMetaMaskButton}
                            </Popover>
                          )}
                        </div>
                      )}
                      <div className="min-w-max flex items-center space-x-1">
                        <Copy
                          size={14}
                          text={generalTx.receivingAssetId}
                          copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-medium">
                            {ellipseAddress(generalTx.receivingAssetId, 5)}
                          </span>}
                        />
                        {!generalTx.receivingAsset && generalTx.receivingChain?.explorer?.url && (
                          <a
                            href={`${generalTx.receivingChain.explorer.url}${generalTx.receivingChain.explorer[`contract${generalTx.receivingAssetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', generalTx.receivingAssetId)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 dark:text-white"
                          >
                            {generalTx.receivingChain.explorer.icon ?
                              <Image
                                src={generalTx.receivingChain.explorer.icon}
                                alt=""
                                className="w-4 h-4 rounded-full opacity-60 hover:opacity-100"
                              />
                              :
                              <TiArrowRight size={20} className="transform -rotate-45" />
                            }
                          </a>
                        )}
                      </div>
                    </div>
                    :
                    <span className="font-mono text-gray-400 dark:text-gray-600">n/a</span>
                  }
                </div>
                <div className="flex items-center justify-between space-x-2">
                  {sendingTx?.sending_amount && (
                    <div className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-lg text-sm space-x-1 mt-2 mb-1 py-1 px-2">
                      <span className="font-mono font-semibold">{numberFormat(sendingTx.sending_amount, '0,0.000000', true)}</span>
                      <span className="text-gray-600 dark:text-gray-400">{sendingTx.sendingAsset?.symbol || sendingTx.receivingAsset?.symbol}</span>
                    </div>
                  )}
                  {receivingTx?.receiving_amount && (
                    <div className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-lg text-sm space-x-1 mt-2 mb-1 py-1 px-2">
                      <span className="font-mono font-semibold">{numberFormat(receivingTx.receiving_amount, '0,0.000000', true)}</span>
                      <span className="text-gray-600 dark:text-gray-400">{receivingTx.receivingAsset?.symbol || receivingTx.sendingAsset?.symbol}</span>
                    </div>
                  )}
                </div>
              </>
              :
              <div className="flex flex-col space-y-2.5 my-1">
                <div className="skeleton w-72 h-10 sm:ml-auto" />
                <div className="skeleton w-72 h-6 sm:ml-auto" />
              </div>
            }
          </Widget>
          <Widget
            title={<div className="leading-4 uppercase text-gray-400 dark:text-gray-600 text-sm sm:text-base font-semibold mb-2">Token Transfers</div>}
            right={<div className="flex items-center space-x-0.5 mb-2 lg:mb-0.5 -mr-1 sm:-mr-2">
              <div className="flex items-center space-x-1.5 sm:space-x-2">
                {(canCancelSendingTx || canDoAction) && (
                  <HeadShake duration={1500} forever>
                    <Wallet
                      hidden={web3_provider && !mustSwitchNetwork ? true : false}
                      chainIdToConnect={mustSwitchNetwork && ((canCancelSendingTx ? sendingTx?.sendingChainId : receivingTx?.receivingChainId) || default_chain_id)}
                    />
                  </HeadShake>
                )}
                {actionButtons}
                {web3_provider && !mustSwitchNetwork && transferResponse?.status !== 'pending' && (
                  <Wallet />
                )}
              </div>
              {tipsButton}
            </div>}
            className="overflow-x-auto border-0 shadow-md rounded-2xl ml-auto px-5 lg:px-3 xl:px-5"
          >
            <div className="flex flex-col sm:flex-row items-center sm:items-start sm:justify-between space-y-8 sm:space-y-0 my-2">
              {transaction ?
                generalTx?.sendingAddress ?
                  <div className="min-w-max">
                    <div className="flex items-center space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                      {ens_data?.[generalTx.sendingAddress.toLowerCase()]?.name && (
                        <Image
                          src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data?.[generalTx.sendingAddress.toLowerCase()].name}`}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <Link href={`/address/${generalTx.sendingAddress}`}>
                        <a className={`text-gray-400 dark:text-gray-200 text-base sm:text-xs xl:text-sm ${ens_data?.[generalTx.sendingAddress.toLowerCase()]?.name ? 'font-semibold' : 'font-medium'}`}>
                          {ellipseAddress(ens_data?.[generalTx.sendingAddress.toLowerCase()]?.name, 10) || ellipseAddress(generalTx.sendingAddress.toLowerCase(), 6)}
                        </a>
                      </Link>
                      <Copy size={18} text={generalTx.sendingAddress} />
                      {generalTx.sendingChain?.explorer?.url && (
                        <a
                          href={`${generalTx.sendingChain.explorer.url}${generalTx.sendingChain.explorer.address_path?.replace('{address}', generalTx.sendingAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          {generalTx.sendingChain.explorer.icon ?
                            <Image
                              src={generalTx.sendingChain.explorer.icon}
                              alt=""
                              className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                            />
                            :
                            <TiArrowRight size={20} className="transform -rotate-45" />
                          }
                        </a>
                      )}
                    </div>
                    {generalTx.sendingChain && (
                      <div className="flex items-center justify-center sm:justify-start space-x-2.5 mt-1.5">
                        <Image
                          src={generalTx.sendingChain.image}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{chainTitle(generalTx.sendingChain)}</span>
                      </div>
                    )}
                  </div>
                  :
                  <span className="font-mono text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                :
                <div className="flex flex-col space-y-2.5 my-1">
                  <div className="skeleton w-40 h-6" />
                  <div className="skeleton w-24 h-6 mx-auto sm:ml-0" />
                </div>
              }
              <div className="flex flex-col items-center justify-center mx-auto">
                {transaction ?
                  <>
                    <div className={`max-w-min h-6 bg-gray-100 dark:bg-${sendingTx?.status ? ['Fulfilled'].includes(sendingTx.status) ? 'green-600' : ['Prepared'].includes(sendingTx.status) ? 'yellow-500' : 'red-700' : sendingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === sendingTx.chainId) < 0 ? 'gray-700' : 'blue-600'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}>
                      {sendingTx?.status ?
                        ['Fulfilled'].includes(sendingTx.status) ?
                          <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                          :
                          ['Prepared'].includes(sendingTx.status) ?
                            transferResponse && !['success', 'failed'].includes(transferResponse.status) && transfering === 'cancel' && canCancelSendingTx ?
                              <Oval color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                              :
                              <FaRegCheckCircle size={14} className="text-yellow-500 dark:text-white" />
                            :
                            <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                        :
                        sendingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === sendingTx.chainId) < 0 ?
                          <FaQuestion size={14} className="text-gray-300 dark:text-white" />
                          :
                          <TailSpin color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                      }
                      <div className={`uppercase ${sendingTx?.status ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>{sendingTx?.status || (sendingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === sendingTx.chainId) < 0 ? 'Unknown' : 'Preparing')}</div>
                    </div>
                    {sendingTx?.chainTx && sendingTx?.sendingChain?.explorer?.url && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Copy
                          size={12}
                          text={sendingTx.chainTx}
                          copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-normal">
                            {ellipseAddress(sendingTx.chainTx, 6)}
                          </span>}
                        />
                        <a
                          href={`${sendingTx.sendingChain.explorer.url}${sendingTx.sendingChain.explorer.transaction_path?.replace('{tx}', sendingTx.chainTx)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          {sendingTx.sendingChain?.explorer?.icon ?
                            <Image
                              src={sendingTx.sendingChain.explorer.icon}
                              alt=""
                              className="w-4 sm:w-3 xl:w-4 h-4 sm:h-3 xl:h-4 rounded-full opacity-60 hover:opacity-100"
                            />
                            :
                            <TiArrowRight size={16} className="transform -rotate-45" />
                          }
                        </a>
                      </div>
                    )}
                    {sendingTx?.preparedTimestamp && (
                      <div className={`text-gray-400 dark:text-gray-600 text-2xs font-light mt-${1 + (sendingTx?.chainTx ? 0 : 0.5)}`}>
                        {moment(sendingTx.preparedTimestamp).format('MMM D, YYYY h:mm:ss A')}
                      </div>
                    )}
                  </>
                  :
                  <div className="flex flex-col items-center justify-center space-y-1.5 my-1 mx-auto">
                    <div className="skeleton w-24 h-7" />
                    <div className="skeleton w-28 h-4" />
                    <div className="skeleton w-28 h-3.5" />
                  </div>
                }
              </div>
              <div className="mx-auto">
                <div className={`min-w-max grid grid-flow-row grid-cols-3 gap-2 ${transaction ? '' : 'sm:mt-1'}`}>
                  {transaction ?
                    <Image
                      src={generalTx?.sendingChain?.image}
                      alt=""
                      className="w-6 h-6 rounded-full mx-auto"
                    />
                    :
                    <div className="skeleton w-6 h-6 mx-auto" style={{ borderRadius: '100%' }} />
                  }
                  <Image
                    src="/logos/logo.png"
                    alt=""
                    className="w-6 h-6 mx-auto"
                  />
                  {transaction ?
                    <Image
                      src={generalTx?.receivingChain?.image}
                      alt=""
                      className="w-6 h-6 rounded-full mx-auto"
                    />
                    :
                    <div className="skeleton w-6 h-6 mx-auto" style={{ borderRadius: '100%' }} />
                  }
                </div>
                {transaction ?
                  generalTx?.router?.id && (
                    ens_data?.[generalTx.router.id.toLowerCase()]?.name ?
                      <>
                        <div className="flex items-center justify-start sm:justify-center text-gray-400 dark:text-gray-600 text-xs font-medium space-x-1 mt-1.5">
                          <MdOutlineRouter size={16} className="mb-0.5" />
                          <Link href={`/router/${generalTx.router.id}`}>
                            <a className="text-blue-600 dark:text-white font-semibold">
                              {ens_data[generalTx.router.id.toLowerCase()].name}
                            </a>
                          </Link>
                        </div>
                        <div className="flex justify-center">
                          <Copy
                            text={generalTx.router.id}
                            copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-normal">
                              {ellipseAddress(generalTx.router.id, 6)}
                            </span>}
                          />
                        </div>
                      </>
                      :
                      <>
                        <div className="flex items-center font-medium space-x-1 mt-2">
                          <Link href={`/router/${generalTx.router.id}`}>
                            <a className="text-blue-600 dark:text-white text-xs font-medium">
                              {ellipseAddress(generalTx.router.id, 6)}
                            </a>
                          </Link>
                          <Copy size={12} text={generalTx.router.id} />
                        </div>
                        <div className="flex items-center justify-center text-gray-400 dark:text-gray-600 text-xs font-medium space-x-1 mt-0.5">
                          <MdOutlineRouter size={16} className="mb-0.5" />
                          <span>Router</span>
                        </div>
                      </>
                  )
                  :
                  <div className="flex flex-col items-center justify-center space-y-1.5 mt-2 mx-auto">
                    <div className="skeleton w-28 h-4" />
                    <div className="skeleton w-24 h-3.5" />
                  </div>
                }
              </div>
              <div className="flex flex-col items-center justify-center mx-auto">
                {transaction ?
                  <>
                    <div className={`min-w-max max-w-min h-6 bg-gray-100 dark:bg-${receivingTx?.status ? ['Fulfilled'].includes(receivingTx.status) ? 'green-600' : ['Prepared'].includes(receivingTx.status) ? 'yellow-500' : 'red-700' : sendingTx?.status === 'Cancelled' ? 'red-700' : receivingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === receivingTx.chainId) < 0 ? 'gray-700' : 'blue-600'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}>
                      {receivingTx?.status ?
                        ['Fulfilled'].includes(receivingTx.status) ?
                          <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                          :
                          ['Prepared'].includes(receivingTx.status) ?
                            transferResponse && !['success', 'failed'].includes(transferResponse.status) && !(transfering === 'cancel' && canCancelSendingTx) ?
                              <Oval color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                              :
                              <FaRegCheckCircle size={14} className="text-yellow-500 dark:text-white" />
                            :
                            <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                        :
                        sendingTx?.status === 'Cancelled' ?
                          <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                          :
                          receivingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === receivingTx.chainId) < 0 ?
                            <FaQuestion size={14} className="text-gray-300 dark:text-white" />
                            :
                            <TailSpin color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                      }
                      <div className={`uppercase ${receivingTx?.status ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>{receivingTx?.status ? receivingTx.status : sendingTx?.status === 'Cancelled' ? 'Skipped' : receivingTx?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === receivingTx.chainId) < 0 ? 'Unknown' : 'Pending'}</div>
                    </div>
                    {outOfGas && (
                      <div className="mt-1">
                        <Popover
                          placement="top"
                          title={<span className="text-xs">Router out of gas</span>}
                          content={<div className="w-52 text-xs">Low Gas on Router, Transaction Might Not Complete Until Refilled</div>}
                        >
                          <span className="text-red-500 text-xs">Router out of gas</span>
                        </Popover>
                      </div>
                    )}
                    {receivingTx?.chainTx && receivingTx?.receivingChain?.explorer?.url && (
                      <div className="flex items-center space-x-1 mt-1">
                        <Copy
                          size={12}
                          text={receivingTx.chainTx}
                          copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-normal">
                            {ellipseAddress(receivingTx.chainTx, 6)}
                          </span>}
                        />
                        <a
                          href={`${receivingTx.receivingChain.explorer.url}${receivingTx.receivingChain.explorer.transaction_path?.replace('{tx}', receivingTx.chainTx)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          {receivingTx.receivingChain?.explorer?.icon ?
                            <Image
                              src={receivingTx.receivingChain.explorer.icon}
                              alt=""
                              className="w-4 sm:w-3 xl:w-4 h-4 sm:h-3 xl:h-4 rounded-full opacity-60 hover:opacity-100"
                            />
                            :
                            <TiArrowRight size={16} className="transform -rotate-45" />
                          }
                        </a>
                      </div>
                    )}
                    {receivingTx?.preparedTimestamp && (
                      <div className={`text-gray-400 dark:text-gray-600 text-2xs font-light mt-${1 + (receivingTx?.chainTx ? 0 : 0.5)}`}>
                        {moment(receivingTx.preparedTimestamp).format('MMM D, YYYY h:mm:ss A')}
                      </div>
                    )}
                  </>
                  :
                  <div className="flex flex-col items-center justify-center space-y-1.5 my-1 mx-auto">
                    <div className="skeleton w-24 h-7" />
                    <div className="skeleton w-28 h-4" />
                    <div className="skeleton w-28 h-3.5" />
                  </div>
                }
              </div>
              {transaction ?
                generalTx?.receivingAddress ?
                  <div className="min-w-max">
                    <div className="flex items-center sm:justify-end space-x-1.5 sm:space-x-1 xl:space-x-1.5">
                      {ens_data?.[generalTx.receivingAddress.toLowerCase()]?.name && (
                        <Image
                          src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data?.[generalTx.receivingAddress.toLowerCase()].name}`}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                      )}
                      <Link href={`/address/${generalTx.receivingAddress}`}>
                        <a className={`text-gray-400 dark:text-gray-200 text-base sm:text-xs xl:text-sm ${ens_data?.[generalTx.receivingAddress.toLowerCase()]?.name ? 'font-semibold' : 'font-medium'}`}>
                          {ellipseAddress(ens_data?.[generalTx.receivingAddress.toLowerCase()]?.name, 10) || ellipseAddress(generalTx.receivingAddress.toLowerCase(), 6)}
                        </a>
                      </Link>
                      <Copy size={18} text={generalTx.receivingAddress} />
                      {generalTx.receivingChain?.explorer?.url && (
                        <a
                          href={`${generalTx.receivingChain.explorer.url}${generalTx.receivingChain.explorer.address_path?.replace('{address}', generalTx.receivingAddress)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 dark:text-white"
                        >
                          {generalTx.receivingChain.explorer.icon ?
                            <Image
                              src={generalTx.receivingChain.explorer.icon}
                              alt=""
                              className="w-5 sm:w-4 xl:w-5 h-5 sm:h-4 xl:h-5 rounded-full opacity-60 hover:opacity-100"
                            />
                            :
                            <TiArrowRight size={20} className="transform -rotate-45" />
                          }
                        </a>
                      )}
                    </div>
                    {generalTx.receivingChain && (
                      <div className="flex items-center justify-center sm:justify-end space-x-2.5 mt-1.5">
                        <Image
                          src={generalTx.receivingChain.image}
                          alt=""
                          className="w-6 h-6 rounded-full"
                        />
                        <span className="text-gray-800 dark:text-gray-200 text-sm font-medium">{chainTitle(generalTx.receivingChain)}</span>
                      </div>
                    )}
                  </div>
                  :
                  <span className="font-mono text-gray-400 dark:text-gray-600 font-light">Unknown</span>
                :
                <div className="flex flex-col space-y-2.5 my-1">
                  <div className="skeleton w-40 h-6" />
                  <div className="skeleton w-24 h-6 mx-auto sm:mr-0" />
                </div>
              }
            </div>
          </Widget>
        </div>
        <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 gap-4 xl:gap-6 mt-4 xl:mt-6">
          {[sendingTx, receivingTx].map((t, i) => (
            <Widget
              key={i}
              title={<div className="flex items-center space-x-3 mb-4">
                <Image
                  src={t?.[i === 0 ? 'sendingChain' : 'receivingChain']?.image}
                  alt=""
                  className="w-6 h-6 rounded-full"
                />
                <span className="uppercase text-gray-400 dark:text-gray-600 text-base font-semibold">Transaction Details</span>
              </div>}
              className="border-0 shadow-md rounded-2xl p-5 lg:px-3 xl:px-5"
            >
              <div className="w-full flex flex-col space-y-4">
                <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                  <span className="md:w-20 xl:w-40 whitespace-nowrap text-xs lg:text-base font-semibold">Prepare TX:</span>
                  {transaction ?
                    t?.prepareTransactionHash ?
                      <div className="flex items-center">
                        {t[i === 0 ? 'sendingChain' : 'receivingChain']?.explorer?.url ?
                          <a
                            href={`${t[i === 0 ? 'sendingChain' : 'receivingChain'].explorer.url}${t[i === 0 ? 'sendingChain' : 'receivingChain'].explorer.transaction_path?.replace('{tx}', t.prepareTransactionHash)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="uppercase text-blue-600 dark:text-white text-xs lg:text-base font-medium mr-1.5"
                          >
                            {ellipseAddress(t.prepareTransactionHash, 16)}
                          </a>
                          :
                          <span className="text-xs lg:text-base mr-1.5">{ellipseAddress(t.prepareTransactionHash, 16)}</span>
                        }
                        <Copy size={18} text={t.prepareTransactionHash} />
                      </div>
                      :
                      <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                    :
                    <div className="skeleton w-72 h-4 lg:h-6 mt-1" />
                  }
                </div>
                <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                  <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">{t?.cancelTransactionHash ? 'Cancel' : 'Fulfill'} TX:</span>
                  {transaction ?
                    t?.fulfillTransactionHash || t?.cancelTransactionHash ?
                      <div className="flex items-center">
                        {t[i === 0 ? 'sendingChain' : 'receivingChain']?.explorer?.url ?
                          <a
                            href={`${t[i === 0 ? 'sendingChain' : 'receivingChain'].explorer.url}${t[i === 0 ? 'sendingChain' : 'receivingChain'].explorer.transaction_path?.replace('{tx}', t?.fulfillTransactionHash || t?.cancelTransactionHash)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="uppercase text-blue-600 dark:text-white text-xs lg:text-base font-medium mr-1.5"
                          >
                            {ellipseAddress(t?.fulfillTransactionHash || t?.cancelTransactionHash, 16)}
                          </a>
                          :
                          <span className="text-xs lg:text-base mr-1.5">{ellipseAddress(t?.fulfillTransactionHash || t?.cancelTransactionHash, 16)}</span>
                        }
                        <Copy size={18} text={t?.fulfillTransactionHash || t?.cancelTransactionHash} />
                      </div>
                      :
                      <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                    :
                    <div className="skeleton w-72 h-4 lg:h-6 mt-1" />
                  }
                </div>
                <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                  <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">Block:</span>
                  {transaction ?
                    t?.preparedBlockNumber ?
                      t[i === 0 ? 'sendingChain' : 'receivingChain']?.explorer?.url ?
                        <a
                          href={`${t[i === 0 ? 'sendingChain' : 'receivingChain'].explorer.url}${t[i === 0 ? 'sendingChain' : 'receivingChain'].explorer.block_path?.replace('{block}', t.preparedBlockNumber)}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs lg:text-base"
                        >
                          {numberFormat(t.preparedBlockNumber, '0,0')}
                        </a>
                        :
                        <span className="text-xs lg:text-base">{numberFormat(t.preparedBlockNumber, '0,0')}</span>
                      :
                      <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                    :
                    <div className="skeleton w-24 h-4 lg:h-6 mt-1" />
                  }
                </div>
                <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                  <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">Status:</span>
                  {transaction ?
                    i === 0 ?
                      <div className={`max-w-min h-6 bg-gray-100 dark:bg-${t?.status ? ['Fulfilled'].includes(t.status) ? 'green-600' : ['Prepared'].includes(t.status) ? 'yellow-500' : 'red-700' : t?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === t.chainId) < 0 ? 'gray-700' : 'blue-600'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}>
                        {t?.status ?
                          ['Fulfilled'].includes(t.status) ?
                            <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                            :
                            ['Prepared'].includes(t.status) ?
                              transferResponse && !['success', 'failed'].includes(transferResponse.status) && transfering === 'cancel' && canCancelSendingTx ?
                                <Oval color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                                :
                                <FaRegCheckCircle size={14} className="text-yellow-500 dark:text-white" />
                              :
                              <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                          :
                          t?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === t.chainId) < 0 ?
                            <FaQuestion size={14} className="text-gray-300 dark:text-white" />
                            :
                            <TailSpin color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                        }
                        <div className={`uppercase ${t?.status ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>{t?.status || (t?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === t.chainId) < 0 ? 'Unknown' : 'Preparing')}</div>
                      </div>
                      :
                      <div className={`max-w-min h-6 bg-gray-100 dark:bg-${t?.status ? ['Fulfilled'].includes(t.status) ? 'green-600' : ['Prepared'].includes(t.status) ? 'yellow-500' : 'red-700' : sendingTx?.status === 'Cancelled' ? 'red-700' : t?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === t.chainId) < 0 ? 'gray-700' : 'blue-600'} rounded-lg flex items-center space-x-1 py-1 px-1.5`}>
                        {t?.status ?
                          ['Fulfilled'].includes(t.status) ?
                            <FaCheckCircle size={14} className="text-green-600 dark:text-white" />
                            :
                            ['Prepared'].includes(t.status) ?
                              transferResponse && !['success', 'failed'].includes(transferResponse.status) && !(transfering === 'cancel' && canCancelSendingTx) ?
                                <Oval color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                                :
                                <FaRegCheckCircle size={14} className="text-yellow-500 dark:text-white" />
                              :
                              <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                          :
                          sendingTx?.status === 'Cancelled' ?
                            <FaTimesCircle size={14} className="text-red-700 dark:text-white" />
                            :
                            t?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === t.chainId) < 0 ?
                              <FaQuestion size={14} className="text-gray-300 dark:text-white" />
                              :
                              <TailSpin color={theme === 'dark' ? 'white' : '#3B82F6'} width="14" height="14" />
                        }
                        <div className={`uppercase ${t?.status ? 'text-black dark:text-white' : 'text-gray-400 dark:text-white'} text-xs font-semibold`}>{t?.status ? t.status : sendingTx?.status === 'Cancelled' ? 'Skipped' : t?.chainId && chains_data?.findIndex(c => !c?.disabled && c?.chain_id === t.chainId) < 0 ? 'Unknown' : 'Pending'}</div>
                      </div>
                    :
                    <div className="skeleton w-24 h-5 lg:h-7 mt-1" />
                  }
                </div>
                <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                  <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">Time:</span>
                  {transaction ?
                    t?.preparedTimestamp ?
                      <span className="text-xs lg:text-base">
                        <span className="text-gray-400 dark:text-gray-600 mr-1">{moment(t.preparedTimestamp).fromNow()}</span>
                        <span>({moment(t.preparedTimestamp).format('MMM D, YYYY h:mm:ss A')})</span>
                      </span>
                      :
                      <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                    :
                    <div className="skeleton w-60 h-4 lg:h-6 mt-1" />
                  }
                </div>
                {!['Fulfilled'].includes(t?.status) && (
                  <div className="flex flex-col md:flex-row items-start space-y-2 md:space-y-0 space-x-0 md:space-x-2">
                    <span className="md:w-20 xl:w-40 text-xs lg:text-base font-semibold">Expiry:</span>
                    {transaction ?
                      t?.expiry ?
                        <span className="text-xs lg:text-base">
                          <span className="text-gray-400 dark:text-gray-600 mr-1">{moment(t.expiry).fromNow()}</span>
                          <span>({moment(t.expiry).format('MMM D, YYYY h:mm:ss A')})</span>
                        </span>
                        :
                        <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                      :
                      <div className="skeleton w-60 h-4 lg:h-6 mt-1" />
                    }
                  </div>
                )}
              </div>
            </Widget>
          ))}
        </div>
        <div className="mt-4 xl:mt-6">
          <Widget className="border-0 shadow-md rounded-2xl p-5 lg:px-3 xl:px-5">
            <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-2 gap-4 xl:gap-6">
              <div className="flex flex-col space-y-2">
                <span className="text-xs lg:text-base font-semibold">Bid Signature:</span>
                {transaction ?
                  generalTx?.bidSignature ?
                    <div className="flex items-start">
                      <span className="break-all text-gray-400 dark:text-gray-600 text-xs lg:text-base mr-1.5">{generalTx.bidSignature}</span>
                      <Copy size={20} text={generalTx.bidSignature} />
                    </div>
                    :
                    <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                  :
                  <div className="skeleton w-full sm:w-96 h-4 lg:h-6 mt-1" />
                }
              </div>
              <div className="flex flex-col space-y-2">
                <span className="text-xs lg:text-base font-semibold">Signature:</span>
                {transaction ?
                  generalTx?.signature ?
                    <div className="flex items-start">
                      <span className="break-all text-gray-400 dark:text-gray-600 text-xs lg:text-base mr-1.5">{generalTx.signature}</span>
                      <Copy size={20} text={generalTx.signature} />
                    </div>
                    :
                    <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                  :
                  <div className="skeleton w-full sm:w-96 h-4 lg:h-6 mt-1" />
                }
              </div>
            </div>
            <div className="flex flex-col space-y-2 mt-4 xl:mt-6">
              <div className="flex items-center">
                <span className="text-xs lg:text-base font-semibold">Encoded Bid:</span>
                <div className={`space-x-2 ml-auto mr-${transaction ? 8 : 0}`}>
                  <Switch
                    checked={decoded}
                    onChange={() => setDecoded(!decoded)}
                    onColor="#10B981"
                    onHandleColor="#A7F3D0"
                    offColor="#E5E7EB"
                    offHandleColor="#F9FAFB"
                    handleDiameter={24}
                    uncheckedIcon={false}
                    checkedIcon={false}
                    boxShadow="0px 1px 5px rgba(0, 0, 0, 0.2)"
                    activeBoxShadow="0px 1px 5px rgba(0, 0, 0, 0.2)"
                    height={20}
                    width={48}
                    className="react-switch"
                  />
                  <span className={`${decoded ? 'text-green-500 dark:text-green-500' : ''} font-medium`}>Decode{decoded && 'd'}</span>
                </div>
              </div>
              {transaction ?
                generalTx?.encodedBid ?
                  <div className="flex items-start">
                    <div className="w-full bg-gray-100 dark:bg-gray-800 break-all rounded-xl text-gray-400 dark:text-gray-600 text-xs lg:text-base mr-2.5 p-4">
                      {decoded ?
                        convertToJson(decodeAuctionBid(generalTx.encodedBid)) ?
                          decodedBid
                          :
                          decodeAuctionBid(generalTx.encodedBid)
                        :
                        generalTx.encodedBid
                      }
                    </div>
                    <Copy size={20} text={decoded ? JSON.stringify(convertToJson(decodeAuctionBid(generalTx.encodedBid))) : generalTx.encodedBid} className="mt-4" />
                  </div>
                  :
                  <span className="font-mono text-gray-400 dark:text-gray-600 text-xs lg:text-base">n/a</span>
                :
                <div className="flex flex-col space-y-3">
                  {[...Array(8).keys()].map(i => (
                    <div key={i} className="skeleton w-full h-4 lg:h-6" />
                  ))}
                </div>
              }
            </div>
          </Widget>
        </div>
      </>
      :
      <div className="h-96 bg-transparent rounded-xl border-2 border-dashed border-gray-400 dark:border-gray-600 flex items-center justify-center text-gray-400 dark:text-gray-600 text-lg font-medium space-x-1.5 mt-4 xl:mt-6">
        <BsFileEarmarkX size={32} />
        <span>Transaction not found</span>
      </div>
  )
}