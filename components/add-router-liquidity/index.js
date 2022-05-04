import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { FallingLines } from 'react-loader-spinner'

import Modal from '../modals'
import Wallet from '../wallet'
import Copy from '../copy'
import EnsProfile from '../ens-profile'
import { ellipse, loader_color } from '../../lib/utils'

export default ({ disabled = false }) => {
  const { preferences, chains, assets, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { wallet_data } = { ...wallet }
  const { web3_provider } = { ...wallet_data }
  const wallet_address = wallet_data?.address

  const router = useRouter()
  const { query } = { ...router }
  const { address } = { ...query }

  const [data, setData] = useState(null)

  useEffect(() => {
    if (chains_data && assets_data && !data?.chain) {
      setData({
        ...data,
        chain: chains_data?.[0]?.id,
        asset: assets_data?.filter(a => a?.contracts?.findIndex(c => c?.chain_id === chains_data?.[0]?.chain_id && c?.contract_address) > -1)?.[0]?.id,
      })
    }
  }, [chains_data, assets_data, data])

  const reset = () => setData(null)

  const fields = [
    {
      label: 'Chain',
      name: 'chain',
      type: 'select',
      placeholder: 'Select chain',
      options: chains_data?.map(c => {
        return {
          value: c.id,
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

  const hasAllFields = fields.length === fields.filter(f => data?.[f.name]).length

  return (
    <Modal
      disabled={disabled}
      buttonTitle={address ?
        <div className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-lg shadow flex items-center justify-center text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-100 space-x-1.5 py-1.5 px-2">
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
              <div className="form-label text-gray-600 dark:text-gray-400 font-medium">
                {f.label}
              </div>
            )}
            {f.type === 'select' ?
              <select
                placeholder={f.placeholder}
                value={data?.[f.name]}
                onChange={e => setData({ ...data, [`${f.name}`]: e.target.value })}
                className="form-select bg-gray-50 border-0 focus:ring-0 rounded-lg"
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
                onChange={e => setData({ ...data, [`${f.name}`]: e.target.value })}
                className="form-input border-0 focus:ring-0 rounded-lg"
              />
            }
          </div>
        ))}
        {hasAllFields && (
          <div className="w-full flex items-center justify-end space-x-3 pt-2">
            <EnsProfile
              address={wallet_address}
              fallback={wallet_address && (
                <Copy
                  value={wallet_address}
                  title={<span className="text-sm text-gray-400 dark:text-gray-200">
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
            <Wallet />
          </div>
        )}
      </div>}
      onCancel={() => reset()}
      confirmButtonTitle="Add"
      onConfirm={() => {
        
      }}
      onConfirmHide={false}
      onClose={() => reset()}
      noButtons={!hasAllFields || !web3_provider}
    />
  )
}