import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Contract, constants, utils } from 'ethers'
import { FallingLines, TailSpin, Watch } from 'react-loader-spinner'
import { BiMessageError, BiMessageCheck } from 'react-icons/bi'

import Notification from '../notifications'
import Modal from '../modals'
import Wallet from '../wallet'
import Copy from '../copy'
import EnsProfile from '../ens-profile'
import { number_format, ellipse, loader_color } from '../../lib/utils'

export default () => {
  const { preferences, chains, assets, rpc_providers, dev, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, rpc_providers: state.rpc_providers, dev: state.dev, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { rpcs } = { ...rpc_providers }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { chain_id, web3_provider, signer } = { ...wallet_data }
  const wallet_address = wallet_data?.address

  const router = useRouter()
  const { query, asPath } = { ...router }
  const { address } = { ...query }

  const [data, setData] = useState(null)
  const [balance, setBalance] = useState(null)

  const [approving, setApproving] = useState(null)
  const [approveResponse, setApproveResponse] = useState(null)

  const [adding, setAdding] = useState(null)
  const [addResponse, setAddResponse] = useState(null)

  useEffect(() => {
    if (chains_data && assets_data && !data?.chain) {
      setData({
        ...data,
        chain: chains_data?.[0]?.id,
        asset: assets_data?.filter(a => a?.contracts?.findIndex(c => c?.chain_id === chains_data?.[0]?.chain_id && c?.contract_address) > -1)?.[0]?.id,
      })
    }
  }, [chains_data, assets_data, data])

  useEffect(() => {
    const getData = async () => {
      if (chains_data && assets_data && data?.chain && data.asset && wallet_address) {
        const chain_data = chains_data.find(c => c?.id === data.chain)
        const asset_data = assets_data.find(a => a?.id === data.asset)
        const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
        const contract_address = contract_data?.contract_address 
        const decimals = contract_data?.contract_decimals || 18
        const rpc = rpcs?.[chain_data?.chain_id]
        let balance
        if (rpc && contract_address) {
          if (contract_address === constants.AddressZero) {
            balance = await rpc.getBalance(wallet_address)
          }
          else {
            const contract = new Contract(contract_address, ['function balanceOf(address owner) view returns (uint256)'], rpc)
            balance = await contract.balanceOf(wallet_address)
          }
        }
        setBalance(balance ? Number(utils.formatUnits(balance, decimals)) : null)
      }
      else {
        setBalance(null)
      }
    }
    getData()
  }, [chains_data, assets_data, rpcs, data, wallet_address, adding])

  const reset = () => {
    setData(null)

    setApproving(null)
    setAdding(null)
  }

  const addLiquidty = async () => {
    if (chains_data && sdk && signer && data) {
      setAdding(true)
      const { chain, asset, amount } = { ...data }
      const chain_data = chains_data?.find(c => c?.id === chain)
      const asset_data = assets_data?.find(a => a?.id === asset)
      const contract_data = asset_data?.contracts?.find(c => c?.chain_id === chain_data?.chain_id)
      const symbol = contract_data?.symbol || asset_data?.symbol
      const decimals = contract_data?.contract_decimals || 18
      const addParams = {
        domain: chain_data?.domain_id,
        amount: utils.parseUnits(amount?.toString() || '0', decimals).toString(),
        assetId: contract_data?.contract_address,
        router: address,
      }
      let failed = false
      try {
        const approve_request = await sdk.nxtpSdkBase.approveIfNeeded(addParams.domain, addParams.assetId, addParams.amount, false)
        if (approve_request) {
          setApproving(true)
          const approve_response = await signer.sendTransaction(approve_request)
          const tx_hash = approve_response?.hash
          setApproveResponse({ status: 'pending', message: `Wait for ${symbol} approval`, tx_hash })
          const approve_receipt = await signer.provider.waitForTransaction(tx_hash)
          setApproveResponse(approve_receipt?.status ?
            null : {
              status: 'failed',
              message: `Failed to approve ${symbol}`,
              tx_hash,
            }
          )
          failed = !approve_receipt?.status
          setApproving(false)
        }
      } catch (error) {
        setApproveResponse({ status: 'failed', message: error?.data?.message || error?.message })
        failed = true
        setApproving(false)
      }
      if (!failed) {
        try {
          const add_request = await sdk.nxtpSdkRouter.addLiquidityForRouter(addParams)
          if (add_request) {
            const add_response = await signer.sendTransaction(add_request)
            const tx_hash = add_response?.hash
            setAddResponse({ status: 'pending', message: `Wait for adding ${symbol} liquidity`, tx_hash })
            const add_receipt = await signer.provider.waitForTransaction(tx_hash)
            failed = !add_receipt?.status
            setAddResponse({
              status: failed ? 'failed' : 'success',
              message: failed ? `Failed to add ${symbol} liquidity` : `Add ${symbol} liquidity successful`,
              tx_hash,
            })
            if (!failed) {
              router.push(`${asPath}?action=refresh`)
            }
          }
        } catch (error) {
          setAddResponse({ status: 'failed', message: error?.data?.message || error?.message })
          failed = true
        }
      }
      setAdding(false)
    }
  }

  const fields = [
    {
      label: 'Chain',
      name: 'chain',
      type: 'select',
      placeholder: 'Select chain',
      options: chains_data?.map(c => {
        return {
          value: c.id,
          title: c.name,
          name: c.name,
        }
      }) || [],
    },
    {
      label: 'Asset',
      name: 'asset',
      type: 'select',
      placeholder: 'Select asset',
      options: assets_data?.filter(a => !data?.chain || (a?.contracts?.findIndex(c => c?.chain_id === chains_data?.find(_c => _c?.id === data.chain)?.chain_id && c?.contract_address) > -1)).map(a => {
        const contract_data = a?.contracts?.find(c => c?.chain_id === chains_data?.find(_c => _c?.id === data?.chain)?.chain_id)
        return {
          value: a.id,
          title: a.name,
          name: `${contract_data?.symbol || a.symbol}${contract_data?.contract_address ? `: ${ellipse(contract_data?.contract_address, 16)}` : ''}`,
        }
      }) || [],
    },
    {
      label: 'Amount',
      name: 'amount',
      type: 'number',
      placeholder: 'Amount',
    },
  ]

  const chain_data = chains_data?.find(c => c?.id === data?.chain)
  const notificationResponse = addResponse || approveResponse
  const max_amount = balance || 0

  const hasAllFields = fields.length === fields.filter(f => data?.[f.name]).length
  const disabled = adding || approving

  return (
    <>
      {notificationResponse && (
        <Notification
          hideButton={true}
          outerClassNames="w-full h-auto z-50 transform fixed top-0 left-0 p-0"
          innerClassNames={`${notificationResponse.status === 'failed' ? 'bg-red-500 dark:bg-red-600' : notificationResponse.status === 'success' ? 'bg-green-500 dark:bg-green-600' : 'bg-blue-600 dark:bg-blue-700'} text-white`}
          animation="animate__animated animate__fadeInDown"
          icon={notificationResponse.status === 'failed' ?
            <BiMessageError className="w-6 h-6 stroke-current mr-2" />
            :
            notificationResponse.status === 'success' ?
              <BiMessageCheck className="w-6 h-6 stroke-current mr-2" />
              :
              <div className="mr-2">
                <Watch color="white" width="20" height="20" />
              </div>
          }
          content={<div className="flex items-center">
            <span className="break-all mr-2">
              {notificationResponse.message}
            </span>
            {chain_data?.explorer?.url && notificationResponse.tx_hash && (
              <a
                href={`${chain_data.explorer.url}${chain_data.explorer.transaction_path?.replace('{tx}', notificationResponse.tx_hash)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mr-2"
              >
                <span className="font-semibold">
                  View on {chain_data.explorer.name}
                </span>
              </a>
            )}
            {notificationResponse.status === 'failed' && notificationResponse.message && (
              <Copy
                value={notificationResponse.message}
                size={24}
                className="cursor-pointer text-slate-200 hover:text-white"
              />
            )}
          </div>}
          onClose={() => {
            setApproveResponse(null)
            setAddResponse(null)
          }}
        />
      )}
      <Modal
        disabled={disabled}
        buttonTitle={address ?
          <div className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg shadow flex items-center justify-center text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-white space-x-1.5 py-1.5 px-2">
            <span className="text-xs font-semibold">
              Manage Router
            </span>
          </div>
          :
          <FallingLines color={loader_color(theme)} width="24" height="24" />
        }
        buttonClassName={`min-w-max ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
        title="Add Router Liquidity"
        body={<div className="form mt-2">
          {fields.map((f, i) => (
            <div key={i} className="form-element">
              {f.label && (
                <div className="flex items-center justify-between space-x-2">
                  <div className="form-label text-slate-600 dark:text-slate-400 font-medium">
                    {f.label}
                  </div>
                  {f.name === 'amount' && wallet_address && typeof balance === 'number' && (
                    <div
                      onClick={() => setData({ ...data, [`${f.name}`]: max_amount })}
                      className="cursor-pointer flex items-center text-black dark:text-white space-x-1.5 mb-2"
                    >
                      <span>
                        Balance:
                      </span>
                      <span className="font-bold">
                        {number_format(balance, '0,0.000000', true)}
                      </span>
                    </div>
                  )}
                </div>
              )}
              {f.type === 'select' ?
                <select
                  placeholder={f.placeholder}
                  value={data?.[f.name]}
                  onChange={e => setData({ ...data, [`${f.name}`]: e.target.value })}
                  className="form-select bg-slate-50 border-0 focus:ring-0 rounded-lg"
                >
                  {f.options?.map((o, i) => (
                    <option
                      key={i}
                      title={o.title}
                      value={o.value}
                    >
                      {o.name}
                    </option>
                  ))}
                </select>
                :
                <input
                  type={f.type}
                  placeholder={f.placeholder}
                  value={data?.[f.name]}
                  onChange={e => {
                    let value
                    if (f.type === 'number') {
                      const regex = /^[0-9.\b]+$/
                      if (e.target.value === '' || regex.test(e.target.value)) {
                        value = e.target.value
                      }
                      value = value < 0 ? 0 : value
                    }
                    else {
                      value = e.target.value
                    }
                    setData({ ...data, [`${f.name}`]: value })
                  }}
                  className="form-input border-0 focus:ring-0 rounded-lg"
                />
              }
            </div>
          ))}
          <div className="w-full flex items-center justify-end space-x-3 pt-2">
            <EnsProfile
              address={wallet_address}
              fallback={wallet_address && (
                <Copy
                  value={wallet_address}
                  title={<span className="text-slate-400 dark:text-slate-200 text-sm">
                    <span className="xl:hidden">
                      {ellipse(wallet_address, 8)}
                    </span>
                    <span className="hidden xl:block">
                      {ellipse(wallet_address, 12)}
                    </span>
                  </span>}
                  size={18}
                />
              )}
            />
            <Wallet connectChainId={chain_data?.chain_id} />
          </div>
        </div>}
        noCancelOnClickOutside={approveResponse || addResponse}
        cancelDisabled={disabled}
        onCancel={() => reset()}
        confirmDisabled={disabled || !(data?.amount > 0 && data.amount <= max_amount)}
        onConfirm={() => addLiquidty()}
        onConfirmHide={false}
        confirmButtonTitle={<span className="flex items-center justify-center space-x-1.5">
          {(adding || approving) && (
            <TailSpin color="white" width="20" height="20" />
          )}
          <span>
            {adding ? approving ? 'Approving' : 'Adding' : 'Add'}
          </span>
        </span>}
        onClose={() => reset()}
        noButtons={!hasAllFields || !web3_provider || chain_data?.chain_id !== chain_id}
      />
    </>
  )
}