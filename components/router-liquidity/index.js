import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { Contract, constants, utils } from 'ethers'
import { TailSpin, Watch } from 'react-loader-spinner'
import { DebounceInput } from 'react-debounce-input'
import { Tooltip } from '@material-tailwind/react'
import { BiMessageError, BiMessageCheck, BiX } from 'react-icons/bi'

import Notification from '../notifications'
import Modal from '../modals'
import SelectChain from '../select-ui/chain'
import SelectAsset from '../select-ui/asset'
import Wallet from '../wallet'
import Copy from '../copy'
import EnsProfile from '../ens-profile'
import { number_format, number_to_fixed, capitalize, ellipse, equals_ignore_case, loader_color } from '../../lib/utils'

const ACTIONS =
  [
    'add',
    'remove',
  ]

export default () => {
  const {
    preferences,
    chains,
    assets,
    asset_balances,
    rpc_providers,
    dev,
    wallet,
  } = useSelector(state =>
    (
      { preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        asset_balances: state.asset_balances,
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
    asset_balances_data,
  } = { ...asset_balances }
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
    web3_provider,
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
  const [action, setAction] =
    useState(
      _.head(ACTIONS)
    )

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

      if (
        chains_data &&
        assets_data &&
        !chain
      ) {
        const chain_data = _.head(chains_data)
        const {
          id,
          chain_id,
        } = { ...chain_data }

        setData(
          {
            ...data,
            chain: id,
            asset:
              _.head(
                assets_data
                  .filter(a =>
                    (a?.contracts || [])
                      .findIndex(c =>
                        c?.chain_id === chain_id &&
                        (
                          c?.next_asset?.contract_address ||
                          c?.contract_address
                        )
                      ) > -1
                  )
              )?.id,
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

        if (
          chains_data &&
          assets_data &&
          chain &&
          asset &&
          asset_balances_data &&
          wallet_address
        ) {
          const chain_data = chains_data
            .find(c =>
              c?.id === chain
            )
          const {
            chain_id,
          } = { ...chain_data }

          const asset_data = assets_data
            .find(a =>
              a?.id === asset
            )
          const {
            contracts,
          } = { ...asset_data }

          const contract_data = (contracts || [])
            .find(c =>
              c?.chain_id === chain_id
            )
          const {
            next_asset,
          } = { ...contract_data }
          let {
            contract_address,
            decimals,
          } = { ...contract_data }

          contract_address =
            next_asset?.contract_address ||
            contract_address

          decimals =
            next_asset?.decimals ||
            decimals

          setBalance(null)

          switch (action) {
            case 'remove':
              try {
                const {
                  amount,
                } = {
                  ...(
                    (asset_balances_data[chain_id] || [])
                      .find(a =>
                        equals_ignore_case(
                          a?.contract_address,
                          contract_address,
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

                let balance

                if (
                  provider &&
                  contract_address
                ) {
                  if (contract_address === constants.AddressZero) {
                    balance =
                      await provider
                        .getBalance(
                          wallet_address,
                        )
                  }
                  else {
                    const contract =
                      new Contract(
                        contract_address,
                        [
                          'function balanceOf(address owner) view returns (uint256)',
                        ],
                        provider,
                      )

                    balance =
                      await contract
                        .balanceOf(
                          wallet_address,
                        )
                  }
                }

                if (balance) {
                  setBalance(
                    Number(
                      utils.formatUnits(
                        balance,
                        decimals ||
                        18,
                      )
                    )
                  )
                }
                else {
                  setBalance(null)
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
    [chains_data, assets_data, asset_balances_data, rpcs, data, wallet_address, action, adding, removing],
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
    if (
      chains_data &&
      sdk &&
      signer &&
      data
    ) {
      setApproving(null)
      setAdding(true)
      setRemoving(null)

      const {
        chain,
        asset,
        amount,
      } = { ...data }

      const chain_data = chains_data
        .find(c =>
          c?.id === chain
        )
      const {
        chain_id,
        domain_id,
      } = { ...chain_data }

      const asset_data = (assets_data || [])
        .find(a =>
          a?.id === asset
        )
      const {
        contracts,
      } = { ...asset_data }

      const contract_data = (contracts || [])
        .find(c =>
          c?.chain_id === chain_id
        )
      const {
        next_asset,
      } = { ...contract_data }
      let {
        contract_address,
        decimals,
        symbol,
      } = { ...contract_data }

      contract_address =
        next_asset?.contract_address ||
        contract_address

      decimals =
        next_asset?.decimals ||
        decimals ||
        18

      symbol =
        next_asset?.symbol ||
        symbol ||
        asset_data?.symbol

      const params = {
        domainId: domain_id,
        amount:
          utils.parseUnits(
            (
              amount ||
              0
            )
            .toString(),
            decimals,
          )
          .toString(),
        tokenAddress: contract_address,
        router: address,
      }

      let failed = false

      try {
        const approve_request =
          await sdk.nxtpSdkBase
            .approveIfNeeded(
              params.domainId,
              params.tokenAddress,
              params.amount,
              false,
            )

        if (approve_request) {
          setApproving(true)

          const approve_response =
            await signer
              .sendTransaction(
                approve_request,
              )

          const {
            hash,
          } = { ...approve_response }

          setApproveResponse(
            {
              status: 'pending',
              message: `Waiting for ${symbol} approval`,
              tx_hash: hash,
            }
          )
          setApproveProcessing(true)

          const approve_receipt =
            await signer.provider
              .waitForTransaction(
                hash,
              )

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
        setApproveResponse(
          {
            status: 'failed',
            message:
              error?.data?.message ||
              error?.message,
          }
        )

        failed = true

        setApproveProcessing(false)
        setApproving(false)
      }

      if (!failed) {
        try {
          const add_request =
            await sdk.nxtpSdkRouter
              .addLiquidityForRouter(
                params,
              )

          if (add_request) {
            const add_response =
              await signer
                .sendTransaction(
                  add_request,
                )

            const {
              hash,
            } = { ...add_response }

            setAddResponse(
              {
                status: 'pending',
                message: `Waiting for add ${symbol} liquidity`,
                tx_hash: hash,
              }
            )
            setAddProcessing(true)

            const add_receipt =
              await signer.provider
                .waitForTransaction(
                  hash,
                )

            const {
              status,
            } = { ...add_receipt }

            failed = !status

            setAddResponse(
              {
                status:
                  failed ?
                    'failed' :
                    'success',
                message:
                  failed ?
                    `Failed to add ${symbol} liquidity` :
                    `Add ${symbol} liquidity successful`,
                tx_hash: hash,
              }
            )

            if (!failed) {
              router.push(`${asPath}?action=refresh`)
            }
          }
        } catch (error) {
          setAddResponse(
            {
              status: 'failed',
              message:
                error?.data?.message ||
                error?.message,
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
    if (
      chains_data &&
      sdk &&
      signer &&
      data
    ) {
      setApproving(null)
      setAdding(null)
      setRemoving(true)

      const {
        chain,
        asset,
        amount,
      } = { ...data }

      const chain_data = chains_data
        .find(c =>
          c?.id === chain
        )
      const {
        chain_id,
        domain_id,
      } = { ...chain_data }

      const asset_data = (assets_data || [])
        .find(a =>
          a?.id === asset
        )
      const {
        contracts,
      } = { ...asset_data }

      const contract_data = (contracts || [])
        .find(c =>
          c?.chain_id === chain_id
        )
      const {
        next_asset,
      } = { ...contract_data }
      let {
        contract_address,
        decimals,
        symbol,
      } = { ...contract_data }

      contract_address =
        next_asset?.contract_address ||
        contract_address

      decimals =
        next_asset?.decimals ||
        decimals ||
        18

      symbol =
        next_asset?.symbol ||
        symbol ||
        asset_data?.symbol

      const params = {
        domainId: domain_id,
        amount:
          utils.parseUnits(
            (
              amount ||
              0
            )
            .toString(),
            decimals,
          )
          .toString(),
        tokenAddress: contract_address,
        recipient: wallet_address,
      }

      let failed = false

      try {
        const approve_request =
          await sdk.nxtpSdkBase
            .approveIfNeeded(
              params.domainId,
              params.tokenAddress,
              params.amount,
              false,
            )

        if (approve_request) {
          setApproving(true)

          const approve_response =
            await signer
              .sendTransaction(
                approve_request,
              )

          const {
            hash,
          } = { ...approve_response }

          setApproveResponse(
            {
              status: 'pending',
              message: `Waiting for ${symbol} approval`,
              tx_hash: hash,
            }
          )
          setApproveProcessing(true)

          const approve_receipt =
            await signer.provider
              .waitForTransaction(
                hash,
              )

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
        setApproveResponse(
          {
            status: 'failed',
            message:
              error?.data?.message ||
              error?.message,
          }
        )

        failed = true

        setApproveProcessing(false)
        setApproving(false)
      }

      if (!failed) {
        try {
          const remove_request =
            await sdk.nxtpSdkRouter
              .removeRouterLiquidity(
                params,
              )

          if (remove_request) {
            const remove_response =
              await signer
                .sendTransaction(
                  remove_request,
                )

            const {
              hash,
            } = { ...remove_response }

            setRemoveResponse(
              {
                status: 'pending',
                message: `Waiting for remove ${symbol} liquidity`,
                tx_hash: hash,
              }
            )
            setRemoveProcessing(true)

            const remove_receipt =
              await signer.provider
                .waitForTransaction(
                  hash,
                )

            const {
              status,
            } = { ...remove_receipt }

            failed = !status

            setRemoveResponse(
              {
                status:
                  failed ?
                    'failed' :
                    'success',
                message:
                  failed ?
                    `Failed to remove ${symbol} liquidity` :
                    `Remove ${symbol} liquidity successful`,
                tx_hash: hash,
              }
            )

            if (!failed) {
              router.push(`${asPath}?action=refresh`)
            }
          }
        } catch (error) {
          setRemoveResponse(
            {
              status: 'failed',
              message:
                error?.data?.message ||
                error?.message,
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

  const chain_data = (chains_data || [])
    .find(c =>
      c?.id === chain
    )
  const {
    chain_id,
    explorer,
  } = { ...chain_data }
  const {
    url,
    transaction_path,
  } = { ...explorer }

  const asset_data = (assets_data || [])
    .find(a =>
      a?.id === asset
    )
  const {
    contracts,
  } = { ...asset_data }

  const contract_data = (contracts || [])
    .find(c =>
      c?.chain_id === chain_id
    )
  const {
    next_asset,
  } = { ...contract_data }
  let {
    contract_address,
    decimals,
    symbol,
  } = { ...contract_data }

  contract_address =
    next_asset?.contract_address ||
    contract_address

  decimals =
    next_asset?.decimals ||
    decimals ||
    18

  const fields =
    [
      {
        label: 'Chain',
        name: 'chain',
        type: 'select',
        placeholder: 'Select chain',
        options:
          (chains_data || [])
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
          (assets_data || [])
            .filter(a =>
              !chain ||
              (a?.contracts || [])
                .findIndex(c =>
                  c?.chain_id === chain_id &&
                  (
                    c?.next_asset?.contract_address ||
                    c?.contract_address
                  )
                ) > -1
            )
            .map(a => {
              const {
                id,
                name,
                contracts,
              } = { ...a }

              const contract_data = (contracts || [])
                .find(c =>
                  c?.chain_id === chain_id
                )
              const {
                next_asset,
              } = { ...contract_data }
              let {
                contract_address,
                symbol,
              } = { ...contract_data }

              contract_address =
                next_asset?.contract_address ||
                contract_address

              symbol =
                next_asset?.symbol ||
                symbol ||
                a?.symbol

              return {
                value: id,
                title: name,
                name:
                  `${symbol}${
                    contract_address ?
                      `: ${
                        ellipse(
                          contract_address,
                          16,
                        )
                      }` :
                      ''
                  }`,
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

  const notificationResponse =
    addResponse ||
    removeResponse ||
    approveResponse

  const {
    status,
    message,
    tx_hash,
  } = { ...notificationResponse }

  const max_amount =
    balance ||
    0

  const hasAllFields =
    fields.length ===
    fields
      .filter(f =>
        data?.[f.name]
      )
      .length

  const disabled =
    adding ||
    removing ||
    approving

  const confirmButtonTitle =
    (
      <span className="flex items-center justify-center space-x-1.5">
        {
          disabled &&
          (
            <TailSpin
              color="white"
              width="20"
              height="20"
            />
          )
        }
        <span>
          {
            action === 'remove' ?
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
                      color="white"
                      width="20"
                      height="20"
                    />
                  </div>
            }
            content={
              <div className="flex items-center">
                <span className="break-all mr-2">
                  {message}
                </span>
                {
                  url &&
                  tx_hash &&
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
                  status === 'failed' &&
                  message &&
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
            onClose={() => {
              setApproveResponse(null)
              setAddResponse(null)
              setRemoveResponse(null)
            }}
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
              color={loader_color(theme)}
              width="24"
              height="24"
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
                      title={<span className="text-slate-400 dark:text-slate-200 text-sm">
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
                      </span>}
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
                    value={
                      chain ||
                      _.head(
                        (chains_data || [])
                          .map(c => c?.id)
                      )
                    }
                    onSelect={c => {
                      setData(
                        {
                          ...data,
                          chain: c,
                        }
                      )
                    }}
                    origin=""
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
                      onSelect={(a, c) => {
                        setData(
                          {
                            ...data,
                            asset: a,
                            amount: null,
                          }
                        )
                      }}
                      chain={chain}
                      origin=""
                      className="flex items-center space-x-1.5 sm:space-x-2 sm:-ml-1"
                    />
                    <DebounceInput
                      debounceTimeout={750}
                      size="small"
                      type="number"
                      placeholder="0.00"
                      disabled={disabled}
                      value={
                        [
                          'string',
                          'number',
                        ].includes(typeof amount) &&
                        ![
                          '',
                        ].includes(amount) &&
                        !isNaN(amount) ?
                          amount :
                          ''
                      }
                      onChange={e => {
                        const regex = /^[0-9.\b]+$/

                        let value

                        if (
                          e.target.value === '' ||
                          regex.test(e.target.value)
                        ) {
                          value = e.target.value
                        }

                        if (typeof value === 'string') {
                          if (value.startsWith('.')) {
                            value = `0${value}`
                          }

                          value =
                            number_to_fixed(
                              value,
                              decimals ||
                              18,
                            )
                        }

                        setData(
                          {
                            ...data,
                            amount: value,
                          }
                        )
                      }}
                      onWheel={e => e.target.blur()}
                      onKeyDown={e =>
                        [
                          'e',
                          'E',
                          '-',
                        ].includes(e.key) &&
                        e.preventDefault()
                      }
                      className={`w-36 sm:w-48 bg-transparent ${disabled ? 'cursor-not-allowed' : ''} rounded border-0 focus:ring-0 sm:text-base font-semibold text-right py-1.5`}
                    />
                  </div>
                  <div className="flex items-center justify-between space-x-2">
                    <div className="flex items-center space-x-1">
                      <div className="text-slate-400 dark:text-slate-500 text-xs font-medium">
                        Balance:
                      </div>
                      {
                        chain_data &&
                        asset &&
                        contract_data &&
                        (
                          <button
                            disabled={disabled}
                            onClick={() => {
                              const amount = balance

                              if (
                                [
                                  'string',
                                  'number',
                                ].includes(typeof amount) &&
                                ![
                                  '',
                                ].includes(amount)
                              ) {
                                setData(
                                  {
                                    ...data,
                                    amount,
                                  }
                                )
                              }
                            }}
                          >
                            <span className="text-black dark:text-white text-xs font-medium">
                              {number_format(
                                balance,
                                '0,0.000000',
                                true,
                              )}
                            </span>
                          </button>
                        )
                      }
                    </div>
                    {
                      web3_provider &&
                      (
                        <button
                          disabled={disabled}
                          onClick={() => {
                            const amount = balance

                            if (
                              [
                                'string',
                                'number',
                              ].includes(typeof amount) &&
                              ![
                                '',
                              ].includes(amount)
                            ) {
                              setData(
                                {
                                  ...data,
                                  amount,
                                }
                              )
                            }
                          }}
                          className={`${disabled ? 'cursor-not-allowed text-slate-400 dark:text-slate-500' : 'cursor-pointer text-blue-400 hover:text-blue-500 dark:text-blue-500 dark:hover:text-blue-400'} text-xs font-medium`}
                        >
                          Select Max
                        </button>
                      )
                    }
                  </div>
                </div>
                {fields
                  .filter(f =>
                    !f?.hidden
                  )
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
                                name === 'amount' &&
                                wallet_address &&
                                typeof balance === 'number' &&
                                (
                                  <div
                                    onClick={() =>
                                      setData(
                                        {
                                          ...data,
                                          [`${name}`]: max_amount,
                                        }
                                      )
                                    }
                                    className="cursor-pointer flex items-center space-x-1.5 mb-2"
                                  >
                                    <span className="text-slate-500 dark:text-slate-500">
                                      Balance:
                                    </span>
                                    <span className="text-black dark:text-white font-medium">
                                      {number_format(
                                        balance,
                                        '0,0.000000',
                                        true,
                                      )}
                                    </span>
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
                            onChange={e =>
                              setData(
                                {
                                  ...data,
                                  [`${name}`]: e.target.value,
                                }
                              )
                            }
                            className="form-select bg-slate-50 border-0 focus:ring-0 rounded-lg"
                          >
                            {(options || [])
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
                            onChange={e => {
                              let value

                              if (type === 'number') {
                                const regex = /^[0-9.\b]+$/

                                if (
                                  e.target.value === '' ||
                                  regex.test(e.target.value)
                                ) {
                                  value = e.target.value
                                }

                                value =
                                  value < 0 ?
                                    0 :
                                    value
                              }
                              else {
                                value = e.target.value
                              }

                              setData(
                                {
                                  ...data,
                                  [`${name}`]: value,
                                }
                              )
                            }}
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
        noCancelOnClickOutside={
          notificationResponse ||
          true
        }
        cancelDisabled={disabled}
        onCancel={() => {
          reset()
          setHidden(true)
        }}
        confirmDisabled={
          disabled ||
          !web3_provider ||
          chain_id !== wallet_chain_id ||
          !hasAllFields ||
          !(
            Number(amount) > 0 &&
            Number(amount) <= max_amount
          )
        }
        onConfirm={() => {
          if (action === 'remove') {
            removeLiquidity()
          }
          else {
            addLiquidity()
          }
        }}
        onConfirmHide={false}
        confirmButtonTitle={
          !web3_provider ||
          chain_id !== wallet_chain_id ||
          !hasAllFields ||
          !(
            Number(amount) > 0 &&
            Number(amount) <= max_amount
          ) ?
            <Tooltip
              placement="top"
              content={
                !web3_provider ?
                  'Please connect your wallet.' :
                  chain_id !== wallet_chain_id ?
                    'Please switch to correct network.' :
                    !hasAllFields ||
                    !(
                      Number(amount) > 0 &&
                      Number(amount) <= max_amount
                    ) ?
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
        confirmButtonClassName={
          action === 'remove' ?
            'btn btn-default btn-rounded bg-red-500 hover:bg-red-600 dark:bg-red-500 dark:hover:bg-red-400 text-white' :
            undefined
        }
        onClose={() => reset()}
        modalClassName="max-w-sm lg:max-w-md"
      />
    </>
  )
}