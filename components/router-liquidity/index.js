import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { Contract, constants, utils } from 'ethers'
import { TailSpin, Watch } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { Tooltip } from '@material-tailwind/react'
import { BiMessageError, BiMessageCheck, BiX } from 'react-icons/bi'

import Copy from '../copy'
import DecimalsFormat from '../decimals-format'
import EnsProfile from '../ens-profile'
import Modal from '../modals'
import Notification from '../notifications'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import Wallet from '../wallet'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { toArray, numberToFixed, capitalize, ellipse, equalsIgnoreCase, loaderColor, parseError } from '../../lib/utils'

const ACTIONS = ['add', 'remove']

export default () => {
  const {
    preferences,
    chains,
    assets,
    router_asset_balances,
    rpc_providers,
    dev,
    wallet,
  } = useSelector(
    state => (
      { preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        router_asset_balances: state.router_asset_balances,
        rpc_providers: state.rpc_providers,
        dev: state.dev,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    router_asset_balances_data,
  } = { ...router_asset_balances }
  const {
    rpcs,
  } = { ...rpc_providers }
  const {
    sdk,
  } = { ...dev }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    browser_provider,
    signer,
  } = { ...wallet_data }

  const wallet_chain_id = wallet_data?.chain_id
  const wallet_address = wallet_data?.address

  const router = useRouter()
  const {
    query,
    asPath,
  } = { ...router }
  const {
    address,
  } = { ...query }

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
      const {
        chain,
      } = { ...data }

      if (chains_data && assets_data && !chain) {
        const {
          id,
          chain_id,
        } = { ..._.head(chains_data) }

        setData(
          {
            ...data,
            chain: id,
            asset: getAsset(null, assets_data, chain_id, undefined, undefined, false, true)?.id,
          }
        )
      }
    },
    [chains_data, assets_data, data],
  )

  useEffect(
    () => {
      const getData = async () => {
        const {
          chain,
          asset,
        } = { ...data }

        if (chain && asset && chains_data && assets_data && router_asset_balances_data && wallet_address) {
          const {
            chain_id,
          } = { ...getChain(chain, chains_data) }

          const {
            contracts,
          } = { ...getChain(asset, assets_data) }

          const contract_data = getContract(chain_id, contracts)

          const {
            next_asset,
          } = { ...contract_data }
          let {
            contract_address,
            decimals,
          } = { ...contract_data }

          contract_address = next_asset?.contract_address || contract_address
          decimals = next_asset?.decimals || decimals

          setBalance(null)

          switch (action) {
            case 'remove':
              try {
                const {
                  amount,
                } = {
                  ...(
                    toArray(router_asset_balances_data[chain_id])
                      .find(a =>
                        equalsIgnoreCase(
                          a?.contract_address,
                          contract_address,
                        ) &&
                        equalsIgnoreCase(
                          a?.router_address,
                          address,
                        )
                      )
                  ),
                }

                setBalance(amount)
              } catch (error) {}
              break
            case 'add':
            default:
              try {
                const provider = rpcs?.[chain_id]

                if (provider && contract_address) {
                  let balance

                  switch (contract_address) {
                    case constants.AddressZero:
                      balance = await provider.getBalance(wallet_address)
                      break
                    default:
                      const contract = new Contract(contract_address, ['function balanceOf(address owner) view returns (uint256)'], provider)
                      balance = await contract.balanceOf(wallet_address)
                      break
                  }

                  if (balance) {
                    setBalance(Number(utils.formatUnits(balance, decimals || 18)))
                  }
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

      const {
        chain,
        asset,
        amount,
      } = { ...data }

      const chain_data = getChain(chain, chains_data)

      const {
        chain_id,
        domain_id,
      } = { ...chain_data }

      const asset_data = getAsset(asset, assets_data)

      const contract_data = getContract(chain_id, asset_data?.contracts)

      const {
        next_asset,
      } = { ...contract_data }
      let {
        contract_address,
        decimals,
        symbol,
      } = { ...contract_data }

      contract_address = next_asset?.contract_address || contract_address
      decimals = next_asset?.decimals || decimals || 18
      symbol = next_asset?.symbol || symbol || asset_data?.symbol

      const params = {
        domainId: domain_id,
        amount: utils.parseUnits((amount || 0).toString(), decimals).toString(),
        tokenAddress: contract_address,
        router: address,
      }

      let failed = false

      try {
        const approve_request = await sdk.sdkBase.approveIfNeeded(params.domainId, params.tokenAddress, params.amount, false)

        if (approve_request) {
          setApproving(true)

          const approve_response = await signer.sendTransaction(approve_request)

          const {
            hash,
          } = { ...approve_response }

          setApproveResponse(
            {
              status: 'pending',
              message: `Waiting for ${symbol} approval`,
              tx_hash: hash,
              chain_data,
            }
          )

          setApproveProcessing(true)

          const approve_receipt = await signer.provider.waitForTransaction(hash)

          const {
            status,
          } = { ...approve_receipt }

          setApproveResponse(
            status ?
              null :
              {
                status: 'failed',
                message: `Failed to approve ${symbol}`,
                tx_hash: hash,
                chain_data,
              }
          )

          failed = !status

          setApproveProcessing(false)
          setApproving(false)
        }
        else {
          setApproving(false)
        }
      } catch (error) {
        const response = parseError(error)

        setApproveResponse(
          {
            status: 'failed',
            ...response,
            chain_data,
          }
        )

        failed = true

        setApproveProcessing(false)
        setApproving(false)
      }

      if (!failed) {
        try {
          const add_request = await sdk.sdkRouter.addLiquidityForRouter(params)

          if (add_request) {
            const add_response = await signer.sendTransaction(add_request)

            const {
              hash,
            } = { ...add_response }

            setAddResponse(
              {
                status: 'pending',
                message: `Waiting for add ${symbol} liquidity`,
                tx_hash: hash,
                chain_data,
              }
            )

            setAddProcessing(true)

            const add_receipt = await signer.provider.waitForTransaction(hash)

            const {
              status,
            } = { ...add_receipt }

            failed = !status

            setAddResponse(
              {
                status: failed ? 'failed' : 'success',
                message: failed ? `Failed to add ${symbol} liquidity` : `Add ${symbol} liquidity successful`,
                tx_hash: hash,
                chain_data,
              }
            )

            if (!failed) {
              router.push(`${asPath}?action=refresh`)
            }
          }
        } catch (error) {
          const response = parseError(error)

          setAddResponse(
            {
              status: 'failed',
              ...response,
              chain_data,
            }
          )

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

      const {
        chain,
        asset,
        amount,
      } = { ...data }

      const chain_data = getChain(chain, chains_data)

      const {
        chain_id,
        domain_id,
      } = { ...chain_data }

      const asset_data = getAsset(asset, assets_data)

      const contract_data = getContract(chain_id, asset_data?.contracts)

      const {
        next_asset,
      } = { ...contract_data }
      let {
        contract_address,
        decimals,
        symbol,
      } = { ...contract_data }

      contract_address = next_asset?.contract_address || contract_address
      decimals = next_asset?.decimals || decimals || 18
      symbol = next_asset?.symbol || symbol || asset_data?.symbol

      const params = {
        domainId: domain_id,
        amount: utils.parseUnits((amount || 0).toString(), decimals).toString(),
        tokenAddress: contract_address,
        router: address,
        recipient: wallet_address,
      }

      let failed = false

      if (!failed) {
        try {
          const remove_request = await sdk.sdkRouter.removeRouterLiquidityFor(params)

          if (remove_request) {
            const remove_response = await signer.sendTransaction(remove_request)

            const {
              hash,
            } = { ...remove_response }

            setRemoveResponse(
              {
                status: 'pending',
                message: `Waiting for remove ${symbol} liquidity`,
                tx_hash: hash,
                chain_data,
              }
            )

            setRemoveProcessing(true)

            const remove_receipt = await signer.provider.waitForTransaction(hash)

            const {
              status,
            } = { ...remove_receipt }

            failed = !status

            setRemoveResponse(
              {
                status: failed ? 'failed' : 'success',
                message: failed ? `Failed to remove ${symbol} liquidity` : `Remove ${symbol} liquidity successful`,
                tx_hash: hash,
                chain_data,
              }
            )

            if (!failed) {
              router.push(`${asPath}?action=refresh`)
            }
          }
        } catch (error) {
          const response = parseError(error)

          setRemoveResponse(
            {
              status: 'failed',
              ...response,
              chain_data,
            }
          )

          failed = true
        }
      }

      setAddProcessing(false)
      setAdding(false)
      setRemoving(false)
    }
  }

  const {
    chain,
    asset,
    amount,
  } = { ...data }

  const chain_data = getChain(chain, chains_data)

  const {
    chain_id,
  } = { ...chain_data }

  const asset_data = getAsset(asset, assets_data)

  const contract_data = getContract(chain_id, asset_data?.contracts)

  const {
    next_asset,
  } = { ...contract_data }

  let {
    contract_address,
    decimals,
    symbol,
  } = { ...contract_data }

  contract_address = next_asset?.contract_address || contract_address
  decimals = next_asset?.decimals || decimals || 18

  const max_amount = balance || 0

  const fields =
    [
      {
        label: 'Chain',
        name: 'chain',
        type: 'select',
        placeholder: 'Select chain',
        options:
          toArray(chains_data)
            .filter(c => !c?.view_only)
            .map(c => {
              const {
                id,
                name,
              } = { ...c }

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
        options:
          toArray(assets_data)
            .filter(a =>
              !chain ||
              toArray(a?.contracts).findIndex(c => getContract(chain_id, a.contracts)) > -1
            )
            .map(a => {
              const {
                id,
                name,
                contracts,
              } = { ...a }

              const contract_data = getContract(chain_id, contracts)

              const {
                next_asset,
              } = { ...contract_data }
              let {
                contract_address,
                symbol,
              } = { ...contract_data }

              contract_address = next_asset?.contract_address || contract_address
              symbol = next_asset?.symbol || symbol || a?.symbol

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

  const notificationResponse = addResponse || removeResponse || approveResponse

  const {
    status,
    message,
    tx_hash,
  } = { ...notificationResponse }

  const {
    explorer,
  } = { ...notificationResponse?.chain_data }

  const {
    url,
    transaction_path,
  } = { ...explorer }

  const disabled = adding || removing || approving

  const confirmButtonTitle = (
    <span className="flex items-center justify-center space-x-1.5">
      {
        disabled &&
        (
          <TailSpin
            width="20"
            height="20"
            color="white"
          />
        )
      }
      <span>
        {action === 'remove' ?
          removing ?
            approving ?
              approveProcessing ?
                'Approving' :
                'Please Approve' :
              removeProcessing ?
                'Removing' :
                typeof approving === 'boolean' ?
                  'Please Confirm' :
                  'Checking Approval' :
            'Remove' :
          adding ?
            approving ?
              approveProcessing ?
                'Approving' :
                'Please Approve' :
              addProcessing ?
                'Adding' :
                typeof approving === 'boolean' ?
                  'Please Confirm' :
                  'Checking Approval' :
            'Add'
        }
      </span>
    </span>
  )

  return (
    <>
      {
        notificationResponse &&
        (
          <Notification
            hideButton={true}
            outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
            innerClassNames={
              `${
                status === 'failed' ?
                  'bg-red-500 dark:bg-red-600' :
                  status === 'success' ?
                    'bg-green-500 dark:bg-green-600' :
                    'bg-blue-600 dark:bg-blue-700'
              } text-white`
            }
            animation="animate__animated animate__fadeInDown"
            icon={
              status === 'failed' ?
                <BiMessageError
                  className="w-6 h-6 stroke-current mr-2"
                /> :
                status === 'success' ?
                  <BiMessageCheck
                    className="w-6 h-6 stroke-current mr-2"
                  /> :
                  <div className="mr-2">
                    <Watch
                      width="20"
                      height="20"
                      color="white"
                    />
                  </div>
            }
            content={
              <div className="flex items-center">
                <span className="break-all mr-2">
                  {message}
                </span>
                {
                  url && tx_hash &&
                  (
                    <a
                      href={`${url}${transaction_path?.replace('{tx}', tx_hash)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mr-2"
                    >
                      <span className="font-semibold">
                        View on {explorer.name}
                      </span>
                    </a>
                  )
                }
                {
                  status === 'failed' && message &&
                  (
                    <Copy
                      size={24}
                      value={message}
                      className="cursor-pointer text-slate-200 hover:text-white"
                    />
                  )
                }
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
        )
      }
      <Modal
        hidden={hidden}
        disabled={disabled}
        onClick={() => setHidden(false)}
        buttonTitle={
          address ?
            <div className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-400 rounded-lg shadow flex items-center justify-center text-white space-x-1.5 py-1.5 px-2">
              <span className="text-sm font-semibold">
                Manage Router
              </span>
            </div> :
            <TailSpin
              width="24"
              height="24"
              color={loaderColor(theme)}
            />
        }
        buttonClassName={`min-w-max ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
        title={
          <div className="flex items-center justify-between">
            <span>
              Manage Router Liquidity
            </span>
            <div
              onClick={() => setHidden(true)}
              className="hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer rounded-full p-2"
            >
              <BiX
                size={18}
              />
            </div>
          </div>
        }
        body={
          <div className="space-y-0">
            <div className="w-full flex items-center justify-end space-x-3">
              <EnsProfile
                address={wallet_address}
                fallback={
                  wallet_address &&
                  (
                    <Copy
                      value={wallet_address}
                      title={
                        <span className="text-slate-400 dark:text-slate-200 text-sm">
                          <span className="xl:hidden">
                            {ellipse(
                              wallet_address,
                              8,
                            )}
                          </span>
                          <span className="hidden xl:block">
                            {ellipse(
                              wallet_address,
                              12,
                            )}
                          </span>
                        </span>
                      }
                    />
                  )
                }
              />
              <Wallet
                connectChainId={chain_data?.chain_id}
              />
            </div>
            <div className="space-y-4">
              <div className="flex items-center justify-between space-x-4">
                <div className="w-fit border-b dark:border-slate-800 flex items-center justify-between space-x-4">
                  {ACTIONS
                    .map((a, i) => (
                      <div
                        key={i}
                        onClick={() => setAction(a)}
                        className={`w-fit border-b-2 ${action === a ? 'border-slate-300 dark:border-slate-200 font-semibold' : 'border-transparent text-slate-400 dark:text-slate-500 font-semibold'} cursor-pointer capitalize text-sm text-left py-3 px-0`}
                      >
                        {a}
                      </div>
                    ))
                  }
                </div>
                <div className="flex items-center space-x-1">
                  <span className="text-sm">
                    on
                  </span>
                  <SelectChain
                    disabled={disabled}
                    value={chain || getChain(null, chains_data, false, false, true)?.id}
                    onSelect={
                      c => {
                        setData(
                          {
                            ...data,
                            chain: c,
                          }
                        )
                      }
                    }
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
                      onSelect={
                        (a, c) => {
                          setData(
                            {
                              ...data,
                              asset: a,
                              amount: null,
                            }
                          )
                        }
                      }
                      chain={chain}
                      className="flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1"
                    />
                    <DebounceInput
                      debounceTimeout={750}
                      size="small"
                      type="number"
                      placeholder="0.00"
                      disabled={disabled}
                      value={['string', 'number'].includes(typeof amount) && ![''].includes(amount) && !isNaN(amount) ? amount : ''}
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

                            value = numberToFixed(value, decimals || 18)
                          }

                          setData(
                            {
                              ...data,
                              amount: value,
                            }
                          )
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
                      {
                        chain_data && contract_data &&
                        (
                          <button
                            disabled={disabled}
                            onClick={
                              () => {
                                const amount = balance

                                if (['string', 'number'].includes(typeof amount) && ![''].includes(amount)) {
                                  setData(
                                    {
                                      ...data,
                                      amount,
                                    }
                                  )
                                }
                              }
                            }
                          >
                            <DecimalsFormat
                              value={balance}
                              className="text-black dark:text-white text-sm font-medium"
                            />
                          </button>
                        )
                      }
                    </div>
                    {
                      browser_provider &&
                      (
                        <button
                          disabled={disabled}
                          onClick={
                            () => {
                              const amount = balance

                              if (['string', 'number'].includes(typeof amount) && ![''].includes(amount)) {
                                setData(
                                  {
                                    ...data,
                                    amount,
                                  }
                                )
                              }
                            }
                          }
                          className={`${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400'} text-sm font-medium`}
                        >
                          Select Max
                        </button>
                      )
                    }
                  </div>
                </div>
                {fields
                  .filter(f => !f?.hidden)
                  .map((f, i) => {
                    const {
                      label,
                      name,
                      type,
                      placeholder,
                      options,
                      className,
                    } = { ...f }

                    return (
                      <div
                        key={i}
                        className={`form-element ${className || ''}`}
                      >
                        {
                          label &&
                          (
                            <div className="flex items-center justify-between space-x-2">
                              <div className="form-label text-slate-500 dark:text-slate-500 font-normal">
                                {label}
                              </div>
                              {
                                name === 'amount' && wallet_address && typeof balance === 'number' &&
                                (
                                  <div
                                    onClick={
                                      () => {
                                        setData(
                                          {
                                            ...data,
                                            [name]: max_amount,
                                          }
                                        )
                                      }
                                    }
                                    className="cursor-pointer flex items-center space-x-1.5 mb-2"
                                  >
                                    <span className="text-slate-500 dark:text-slate-500">
                                      Balance:
                                    </span>
                                    <DecimalsFormat
                                      value={balance}
                                      className="text-black dark:text-white font-medium"
                                    />
                                  </div>
                                )
                              }
                            </div>
                          )
                        }
                        {type === 'select' ?
                          <select
                            placeholder={placeholder}
                            value={data?.[name]}
                            onChange={
                              e => {
                                setData(
                                  {
                                    ...data,
                                    [name]: e.target.value,
                                  }
                                )
                              }
                            }
                            className="form-select bg-slate-50 border-0 focus:ring-0 rounded-lg"
                          >
                            {toArray(options)
                              .map((o, j) => {
                                const {
                                  title,
                                  value,
                                  name,
                                } = { ...o }

                                return (
                                  <option
                                    key={j}
                                    title={title}
                                    value={value}
                                  >
                                    {name}
                                  </option>
                                )
                              })
                            }
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

                                  value = value < 0 ? 0 : value
                                }
                                else {
                                  value = e.target.value
                                }

                                setData(
                                  {
                                    ...data,
                                    [name]: value,
                                  }
                                )
                              }
                            }
                            className="form-input border-0 focus:ring-0 rounded-lg"
                          />
                        }
                      </div>
                    )
                  })
                }
              </div>
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
        confirmDisabled={disabled || !has_all_fields || !browser_provider || chain_id !== wallet_chain_id || !(Number(amount) > 0 && Number(amount) <= max_amount)}
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
          !has_all_fields || !browser_provider || chain_id !== wallet_chain_id || !(Number(amount) > 0 && Number(amount) <= max_amount) ?
            <Tooltip
              placement="top"
              content={
                !browser_provider ?
                  'Please connect your wallet.' :
                  chain_id !== wallet_chain_id ?
                    'Please switch to correct network.' :
                    !has_all_fields || !(Number(amount) > 0 && Number(amount) <= max_amount) ?
                      !(Number(amount) <= max_amount) ?
                        'Insufficient Funds.' :
                        'Please fill in the amount.' :
                      null
              }
              className="z-50 bg-black text-white text-xs"
            >
              {confirmButtonTitle}
            </Tooltip> :
            confirmButtonTitle
        }
        confirmButtonClassName={action === 'remove' ? 'btn btn-default btn-rounded bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-400 text-white' : undefined}
        onClose={() => reset()}
        modalClassName="max-w-sm lg:max-w-md"
      />
    </>
  )
}