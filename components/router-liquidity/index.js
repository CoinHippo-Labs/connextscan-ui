import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Tooltip } from '@material-tailwind/react'
import { DebounceInput } from 'react-debounce-input'
import _ from 'lodash'
import { BiX } from 'react-icons/bi'

import Spinner from '../spinner'
import NumberDisplay from '../number'
import Modal from '../modal'
import Notification from '../notification'
import Copy from '../copy'
import EnsProfile from '../profile/ens'
import ExplorerLink from '../explorer/link'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import Wallet from '../wallet'
import Wrapper from '../wrapper/xERC20'
import { getBalance } from '../../lib/chain/evm'
import { GAS_LIMIT_ADJUSTMENT } from '../../lib/config'
import { getChainData, getAssetData, getContractData } from '../../lib/object'
import { toBigNumber, toFixedNumber, formatUnits, parseUnits, isNumber } from '../../lib/number'
import { toArray, numberToFixed, ellipse, equalsIgnoreCase, normalizeMessage, parseError } from '../../lib/utils'

const ACTIONS = ['add', 'remove']

export default () => {
  const { chains, assets, router_asset_balances, rpc_providers, dev, wallet } = useSelector(state => ({ chains: state.chains, assets: state.assets, router_asset_balances: state.router_asset_balances, rpc_providers: state.rpc_providers, dev: state.dev, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { router_asset_balances_data } = { ...router_asset_balances }
  const { rpcs } = { ...rpc_providers }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { provider, signer } = { ...wallet_data }
  const wallet_chain_id = wallet_data?.chain_id
  const wallet_address = wallet_data?.address

  const router = useRouter()
  const { query, asPath } = { ...router }
  const { address } = { ...query }

  const [hidden, setHidden] = useState(true)
  const [data, setData] = useState(null)
  const [balance, setBalance] = useState(null)
  const [action, setAction] = useState(_.head(ACTIONS))

  const [approving, setApproving] = useState(null)
  const [approveProcessing, setApproveProcessing] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [adding, setAdding] = useState(null)
  const [addProcessing, setAddProcessing] = useState(null)
  const [addResponse, setAddResponse] = useState(null)

  const [removing, setRemoving] = useState(null)
  const [removeProcessing, setRemoveProcessing] = useState(null)
  const [removeResponse, setRemoveResponse] = useState(null)

  useEffect(
    () => {
      const { chain } = { ...data }
      if (chains_data && assets_data && !chain) {
        const { id, chain_id } = { ...getChainData(undefined, chains_data, { not_disabled: true, get_head: true }) }
        setData({ ...data, chain: id, asset: getAssetData(undefined, assets_data, { chain_id, get_head: true })?.id })
      }
    },
    [chains_data, assets_data, data],
  )

  useEffect(
    () => {
      const getData = async () => {
        const { chain, asset } = { ...data }
        if (chains_data && assets_data && router_asset_balances_data && wallet_address && chain && asset) {
          setBalance(null)

          const { chain_id } = { ...getChainData(chain, chains_data) }
          const { contracts } = { ...getAssetData(asset, assets_data) }
          const contract_data = getContractData(chain_id, contracts)
          const { next_asset } = { ...contract_data }
          let { contract_address, xERC20, decimals } = { ...contract_data }
          contract_address = next_asset?.contract_address || xERC20 || contract_address
          decimals = next_asset?.decimals || decimals || 18

          switch (action) {
            case 'remove':
              try {
                const { amount } = { ...toArray(router_asset_balances_data[chain_id]).find(d => equalsIgnoreCase(d.contract_address, contract_address) && equalsIgnoreCase(d.router_address, address)) }
                setBalance(amount)
              } catch (error) {}
              break
            case 'add':
            default:
              try {
                const balance = await getBalance(wallet_address, { contract_address, decimals }, chain, chains_data)
                if (balance) {
                  setBalance(formatUnits(balance, decimals))
                }
              } catch (error) {}
              break
          }
        }
        else {
          setBalance(null)
        }
      }
      getData()
    },
    [chains_data, assets_data, router_asset_balances_data, rpcs, wallet_address, data, action, adding, removing],
  )

  const reset = () => {
    setData(null)
    setApproving(null)
    setApproveProcessing(null)
    setAdding(null)
    setAddProcessing(null)
    setRemoving(null)
    setRemoveProcessing(null)
  }

  const addLiquidity = async () => {
    if (chains_data && sdk && signer && data) {
      setApproving(null)
      setAdding(true)
      setRemoving(null)

      const { chain, asset, amount } = { ...data }
      const chain_data = getChainData(chain, chains_data)
      const { chain_id, domain_id } = { ...chain_data }

      const asset_data = getAssetData(asset, assets_data)

      const { contracts, is_xERC20 } = { ...asset_data }
      const contract_data = getContractData(chain_id, contracts)
      const { next_asset } = { ...contract_data }
      let { contract_address, decimals, symbol, xERC20 } = { ...contract_data }
      contract_address = next_asset?.contract_address || contract_address
      decimals = next_asset?.decimals || decimals || 18
      symbol = next_asset?.symbol || symbol || asset_data?.symbol

      const params = {
        domainId: domain_id,
        amount: parseUnits(amount, decimals),
        tokenAddress: is_xERC20 ? xERC20 : contract_address,
        router: address,
      }

      let failed = false
      try {
        const request = await sdk.sdkBase.approveIfNeeded(params.domainId, params.tokenAddress, params.amount, false)
        if (request) {
          setApproving(true)
          const response = await signer.sendTransaction(request)
          const { hash } = { ...response }
          setApproveResponse({
            status: 'pending',
            message: `Waiting for ${symbol} approval`,
            tx_hash: hash,
            chain_data,
          })

          setApproveProcessing(true)
          const receipt = await signer.provider.waitForTransaction(hash)
          const { status } = { ...receipt }
          failed = !status
          setApproveResponse(!failed ? null : { status: 'failed', message: `Failed to approve ${symbol}`, tx_hash: hash, chain_data })
          setApproveProcessing(false)
        }
        setApproving(false)
      } catch (error) {
        const response = parseError(error)
        setApproveResponse({ status: 'failed', ...response, chain_data })
        setApproveProcessing(false)
        setApproving(false)
        failed = true
      }

      if (!failed) {
        try {
          const request = await sdk.sdkRouter.addLiquidityForRouter(params)
          if (request) {
            try {
              const gasLimit = await signer.estimateGas(request)
              if (gasLimit) {
                request.gasLimit = toBigNumber(toFixedNumber(gasLimit).mulUnsafe(toFixedNumber(GAS_LIMIT_ADJUSTMENT)))
              }
            } catch (error) {}
            const response = await signer.sendTransaction(request)
            const { hash } = { ...response }
            setAddResponse({
              status: 'pending',
              message: `Waiting for add ${symbol} liquidity`,
              tx_hash: hash,
              chain_data,
            })

            setAddProcessing(true)
            const receipt = await signer.provider.waitForTransaction(hash)
            const { status } = { ...receipt }
            failed = !status
            setAddResponse({
              status: failed ? 'failed' : 'success',
              message: failed ? `Failed to add ${symbol} liquidity` : `Add ${symbol} liquidity successful`,
              tx_hash: hash,
              chain_data,
            })
            if (!failed) {
              router.push(`${asPath}?action=refresh`)
            }
          }
        } catch (error) {
          const response = parseError(error)
          setAddResponse({ status: 'failed', ...response, chain_data })
          failed = true
        }
      }

      setAddProcessing(false)
      setAdding(false)
      setRemoving(false)
    }
  }

  const removeLiquidity = async () => {
    if (chains_data && sdk && signer && data) {
      setApproving(null)
      setAdding(null)
      setRemoving(true)

      const { chain, asset, amount } = { ...data }
      const chain_data = getChainData(chain, chains_data)
      const { chain_id, domain_id } = { ...chain_data }

      const asset_data = getAssetData(asset, assets_data)
      const { contracts, is_xERC20 } = { ...asset_data }
      const contract_data = getContractData(chain_id, contracts)
      const { next_asset } = { ...contract_data }
      let { contract_address, decimals, symbol, xERC20 } = { ...contract_data }
      contract_address = next_asset?.contract_address || contract_address
      decimals = next_asset?.decimals || decimals || 18
      symbol = next_asset?.symbol || symbol || asset_data?.symbol

      const params = {
        domainId: domain_id,
        amount: parseUnits(amount, decimals),
        tokenAddress: is_xERC20 ? xERC20 : contract_address,
        router: address,
        recipient: wallet_address,
      }

      let failed = false
      if (!failed) {
        try {
          const request = await sdk.sdkRouter.removeRouterLiquidityFor(params)
          if (request) {
            const response = await signer.sendTransaction(request)
            const { hash } = { ...response }
            setRemoveResponse({
              status: 'pending',
              message: `Waiting for remove ${symbol} liquidity`,
              tx_hash: hash,
              chain_data,
            })

            setRemoveProcessing(true)
            const receipt = await signer.provider.waitForTransaction(hash)
            const { status } = { ...receipt }
            failed = !status
            setRemoveResponse({
              status: failed ? 'failed' : 'success',
              message: failed ? `Failed to remove ${symbol} liquidity` : `Remove ${symbol} liquidity successful`,
              tx_hash: hash,
              chain_data,
            })
            if (!failed) {
              router.push(`${asPath}?action=refresh`)
            }
          }
        } catch (error) {
          const response = parseError(error)
          setRemoveResponse({ status: 'failed', ...response, chain_data })
          failed = true
        }
      }

      setAddProcessing(false)
      setAdding(false)
      setRemoving(false)
    }
  }

  const { chain, asset, amount } = { ...data }
  const chain_data = getChainData(chain, chains_data)
  const { chain_id } = { ...chain_data }

  const asset_data = getAssetData(asset, assets_data)
  const { contracts } = { ...asset_data }
  const contract_data = getContractData(chain_id, contracts)
  const { next_asset } = { ...contract_data }
  let { contract_address, decimals, symbol } = { ...contract_data }
  contract_address = next_asset?.contract_address || contract_address
  decimals = next_asset?.decimals || decimals || 18
  symbol = next_asset?.symbol || symbol || asset_data?.symbol
  const max_amount = balance || 0

  const fields = [
    {
      label: 'Chain',
      name: 'chain',
      type: 'select',
      placeholder: 'Select chain',
      options: toArray(chains_data).map(d => {
        const { id, name } = { ...d }
        return {
          value: id,
          title: name,
          name,
        }
      }),
      hidden: true,
    },
    {
      label: 'Asset',
      name: 'asset',
      type: 'select',
      placeholder: 'Select asset',
      options: toArray(assets_data).filter(d => !chain || getContractData(chain_id, d.contracts)).map(d => {
        const { id, name, contracts } = { ...d }
        const contract_data = getContractData(chain_id, contracts)
        const { next_asset } = { ...contract_data }
        let { contract_address, symbol } = { ...contract_data }
        contract_address = next_asset?.contract_address || contract_address
        symbol = next_asset?.symbol || symbol || d?.symbol
        return {
          value: id,
          title: name,
          name: `${symbol}${contract_address ? `: ${ellipse(contract_address, 16)}` : ''}`,
        }
      }),
      hidden: true,
    },
    {
      label: 'Amount',
      name: 'amount',
      type: 'number',
      placeholder: 'Amount',
      hidden: true,
    },
  ]

  const has_all_fields = fields.length === fields.filter(f => data?.[f.name]).length
  const disabled = adding || removing || approving
  const response = addResponse || removeResponse || approveResponse
  const { status, message, tx_hash } = { ...response }
  const { explorer } = { ...response?.chain_data }

  const confirmButtonTitle = (
    <span className="flex items-center justify-center space-x-1.5">
      {disabled && <Spinner width={20} height={20} color="white" />}
      <span>
        {action === 'remove' ?
          removing ?
            approving ?
              approveProcessing ? 'Approving' : 'Please Approve' :
              removeProcessing ?
                'Removing' :
                typeof approving === 'boolean' ? 'Please Confirm' : 'Checking Approval' :
            'Remove' :
          adding ?
            approving ?
              approveProcessing ? 'Approving' : 'Please Approve' :
              addProcessing ?
                'Adding' :
                typeof approving === 'boolean' ? 'Please Confirm' : 'Checking Approval' :
            'Add'
        }
      </span>
    </span>
  )

  return (
    <>
      {response && (
        <Notification
          status={status}
          body={
            <div className="flex items-center">
              <span className="leading-5 break-words text-sm 3xl:text-xl font-medium mr-2">
                {ellipse(normalizeMessage(message, status), 128)}
              </span>
              {tx_hash && (
                <div className="mr-2">
                  <ExplorerLink value={tx_hash} explorer={explorer} />
                </div>
              )}
              {status === 'failed' && message && <Copy value={message} className="cursor-pointer text-slate-200 hover:text-white" />}
            </div>
          }
          onClose={
            () => {
              setApproveResponse(null)
              setAddResponse(null)
              setRemoveResponse(null)
            }
          }
        />
      )}
      <Modal
        hidden={hidden}
        disabled={disabled}
        onClick={() => setHidden(false)}
        buttonTitle={
          address ?
            <div className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded text-white text-sm font-semibold text-center py-1.5 px-2">
              Manage Router
            </div> :
            <Spinner />
        }
        buttonClassName={`min-w-max ${disabled ? 'cursor-not-allowed' : ''} rounded flex items-center justify-center`}
        title={
          <div className="flex items-center justify-between">
            <span className="normal-case">
              Manage Router Liquidity
            </span>
            <div
              onClick={() => setHidden(true)}
              className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-full p-2"
            >
              <BiX size={18} />
            </div>
          </div>
        }
        body={
          <div>
            <div className="w-full flex items-center justify-end space-x-3">
              <EnsProfile address={wallet_address} />
              <Wallet connectChainId={chain_id} />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-4">
                <div className="w-fit border-b dark:border-slate-800 flex items-center justify-between space-x-4">
                  {ACTIONS.map((a, i) => {
                    const disabled = a === 'remove' && !equalsIgnoreCase(wallet_address, address)
                    const selectComponent = (
                      <div
                        key={i}
                        onClick={
                          () => {
                            if (!disabled) {
                              setAction(a)
                            }
                          }
                        }
                        className={`w-fit border-b-2 ${action === a ? 'border-slate-300 dark:border-slate-200' : 'border-transparent text-slate-400 dark:text-slate-500'} ${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer'} capitalize text-sm font-semibold text-left py-3 px-0`}
                      >
                        {a}
                      </div>
                    )
                    return (
                      a === 'remove' && disabled ?
                        <Tooltip content="Only router can remove liquidity.">
                          {selectComponent}
                        </Tooltip> :
                        selectComponent
                    )
                  })}
                </div>
                <div className="flex items-center space-x-2">
                  <span className="text-sm">
                    on
                  </span>
                  <SelectChain
                    disabled={disabled}
                    value={chain || getChainData(undefined, chains_data, { get_head: true })?.id}
                    onSelect={c => { setData({ ...data, chain: c }) }}
                    canClose={false}
                    className="w-fit flex items-center justify-center space-x-1.5 sm:space-x-2"
                  />
                </div>
              </div>
              <div className="form">
                <div className="bg-slate-100 dark:bg-slate-900 rounded border dark:border-slate-700 space-y-0.5 py-3.5 px-3">
                  <div className="flex items-center justify-between space-x-2">
                    <SelectAsset
                      disabled={disabled}
                      value={asset}
                      onSelect={(a, c) => { setData({ ...data, asset: a, amount: null }) }}
                      chain={chain}
                      canClose={false}
                      className="flex items-center space-x-1.5 sm:space-x-2"
                    />
                    <DebounceInput
                      debounceTimeout={750}
                      size="small"
                      type="number"
                      placeholder="0.00"
                      disabled={disabled}
                      value={isNumber(amount) ? amount : ''}
                      onChange={
                        e => {
                          const regex = /^[0-9.\b]+$/
                          let value
                          if (e.target.value === '' || regex.test(e.target.value)) {
                            value = e.target.value
                          }
                          if (typeof value === 'string') {
                            if (value.startsWith('.')) {
                              value = `0${value}`
                            }
                            value = numberToFixed(value, decimals)
                          }
                          setData({ ...data, amount: value })
                        }
                      }
                      onWheel={e => e.target.blur()}
                      onKeyDown={e => ['e', 'E', '-'].includes(e.key) && e.preventDefault()}
                      className={`w-36 sm:w-48 bg-transparent ${disabled ? 'cursor-not-allowed' : ''} rounded border-0 focus:ring-0 sm:text-lg font-semibold text-right py-1.5`}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="text-slate-400 dark:text-slate-500 text-sm font-medium">
                        Balance:
                      </div>
                      {chain_data && contract_data && (
                        <button
                          disabled={disabled}
                          onClick={
                            () => {
                              const amount = balance
                              if (isNumber(amount)) {
                                setData({ ...data, amount })
                              }
                            }
                          }
                        >
                          <NumberDisplay value={balance} className="text-black dark:text-white text-sm font-medium" />
                        </button>
                      )}
                    </div>
                    {provider && (
                      <button
                        disabled={disabled}
                        onClick={
                          () => {
                            const amount = balance
                            if (isNumber(amount)) {
                              setData({ ...data, amount })
                            }
                          }
                        }
                        className={`${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400'} text-sm font-medium`}
                      >
                        Select Max
                      </button>
                    )}
                  </div>
                </div>
                {fields.filter(f => !f.hidden).map((f, i) => {
                  const { label, name, type, placeholder, options, className } = { ...f }
                  return (
                    <div key={i} className={`form-element ${className || ''}`}>
                      {label && (
                        <div className="flex items-center justify-between space-x-2">
                          <div className="form-label text-slate-600 dark:text-slate-200 font-medium">
                            {label}
                          </div>
                          {name === 'amount' && wallet_address && isNumber(balance) && (
                            <div
                              onClick={() => { setData({ ...data, [name]: max_amount }) }}
                              className="cursor-pointer flex items-center space-x-1.5 mb-2"
                            >
                              <span className="text-slate-500 dark:text-slate-500">
                                Balance:
                              </span>
                              <NumberDisplay value={balance} className="text-black dark:text-white font-medium" />
                            </div>
                          )}
                        </div>
                      )}
                      {type === 'select' ?
                        <select
                          placeholder={placeholder}
                          value={data?.[name]}
                          onChange={e => setData({ ...data, [name]: e.target.value })}
                          className="form-select min-w-fit bg-slate-50 rounded border-0 focus:ring-0"
                          style={{ width: '124px' }}
                        >
                          {toArray(options).map((o, j) => {
                            const { title, value, name } = { ...o }
                            return (
                              <option key={j} title={title} value={value}>
                                {name}
                              </option>
                            )
                          })}
                        </select> :
                        <input
                          type={type}
                          placeholder={placeholder}
                          value={data?.[name]}
                          onChange={
                            e => {
                              let value
                              if (type === 'number') {
                                const regex = /^[0-9.\b]+$/
                                if (e.target.value === '' || regex.test(e.target.value)) {
                                  value = e.target.value
                                }
                                value = value > 0 ? value : 0
                              }
                              else {
                                value = e.target.value
                              }
                              setData({ ...data, [name]: value })
                            }
                          }
                          className="form-input rounded border-0 focus:ring-0"
                        />
                      }
                    </div>
                  )
                })}
              </div>
              {contract_data?.xERC20 && (
                <Wrapper
                  tokenId={asset}
                  contractData={contract_data}
                />
              )}
            </div>
          </div>
        }
        noCancelOnClickOutside={true}
        cancelDisabled={disabled}
        onCancel={
          () => {
            reset()
            setHidden(true)
          }
        }
        confirmDisabled={disabled || !has_all_fields || !provider || chain_id !== wallet_chain_id || !(Number(amount) > 0 && Number(amount) <= max_amount)}
        onConfirm={
          () => {
            switch (action) {
              case 'remove':
                removeLiquidity()
                break
              case 'add':
              default:
                addLiquidity()
                break
            }
          }
        }
        onConfirmHide={false}
        confirmButtonTitle={
          !has_all_fields || !provider || chain_id !== wallet_chain_id || !(Number(amount) > 0 && Number(amount) <= max_amount) ?
            <Tooltip content={!provider ? 'Please connect your wallet.' : chain_id !== wallet_chain_id ? 'Please switch to correct network.' : !has_all_fields || !(Number(amount) > 0 && Number(amount) <= max_amount) ? !(Number(amount) <= max_amount) ? 'Insufficient Funds.' : 'Please fill in the amount.' : null}>
              {confirmButtonTitle}
            </Tooltip> :
            confirmButtonTitle
        }
        confirmButtonClassName={action === 'remove' ? 'btn btn-default btn-rounded bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-400 text-white text-sm 3xl:text-base' : undefined}
        onClose={() => reset()}
        modalClassName="max-w-md"
      />
    </>
  )
}