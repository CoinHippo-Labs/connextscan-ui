import Link from 'next/link'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { BigNumber, constants, utils } from 'ethers'
import { TailSpin } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'

import Image from '../image'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import Datatable from '../datatable'
import AddToken from '../add-token'
import Copy from '../copy'

import { chainName } from '../../lib/object/chain'
import { currency_symbol } from '../../lib/object/currency'
import { number_format, ellipse, loader_color } from '../../lib/utils'

export default ({ data }) => {
  const { preferences, chains, assets } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const [chainSelect, setChainSelect] = useState('')
  const [assetSelect, setAssetSelect] = useState('')

  const chain_data = chains_data?.find(c => c?.id === chainSelect)
  const assets_data_filtered_mapped = assets_data?.filter(a => !assetSelect || a?.id === assetSelect).flatMap(a =>
    a?.contracts?.filter(c => !chain_data || c?.chain_id === chain_data.chain_id).map((c, i) => {
      let chain_asset_data = {
        i,
        ...a,
        ...c,
        chain_data: chains_data?.find(_c => _c?.chain_id === c?.chain_id),
      }
      delete chain_asset_data.contracts
      const price = chain_asset_data.price || 0
      const liquidity = data?.find(d => d?.chain_id === chain_asset_data.chain_id && d?.address?.toLowerCase() === chain_asset_data.contract_address?.toLowerCase())
      const amount = data ? Number(utils.formatUnits(BigNumber.from(liquidity?.amount || '0'), chain_asset_data.contract_decimals || 6)) : null
      const value = typeof amount === 'number' ? amount * price : null
      chain_asset_data = {
        ...chain_asset_data,
        amount,
        value,
      }
      return chain_asset_data
    }) || []
  )

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
      {assets_data_filtered_mapped ?
        <div className="grid">
          <Datatable
            columns={[
              {
                Header: '#',
                accessor: 'i',
                sortType: (a, b) => a.original.i > b.original.i ? 1 : -1,
                Cell: props => (
                  <span className="font-mono font-semibold">
                    {number_format((props.flatRows?.indexOf(props.row) > -1 ?
                      props.flatRows.indexOf(props.row) : props.value
                    ) + 1, '0,0')}
                  </span>
                ),
              },
              {
                Header: 'Asset',
                accessor: 'symbol',
                sortType: (a, b) => a.original.symbol > b.original.symbol ? 1 : -1,
                Cell: props => (
                  <div className="min-w-max flex items-start space-x-2 -mt-0.5">
                    {props.row.original.image && (
                      <Image
                        src={props.row.original.image}
                        alt=""
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                    <div className="space-y-0.5">
                      <div className="text-base font-semibold">
                        {props.value}
                      </div>
                      <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs">
                        {props.row.original.name}
                      </div>
                    </div>
                  </div>
                ),
              },
              {
                Header: 'Address',
                accessor: 'contract_address',
                sortType: (a, b) => a.original.contract_address > b.original.contract_address ? 1 : -1,
                Cell: props => (
                  <div className="min-w-max flex items-center space-x-1.5">
                    <Copy
                      value={props.value}
                      size={20}
                    />
                    {props.row.original.chain_data?.explorer?.url && (
                      <a
                        href={`${props.row.original.chain_data.explorer.url}${props.row.original.chain_data.explorer[`contract${props.value === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', props.value)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center text-blue-600 dark:text-white"
                      >
                        {props.row.original.chain_data.explorer.icon ?
                          <Image
                            src={props.row.original.chain_data.explorer.icon}
                            alt=""
                            width={20}
                            height={20}
                            className="rounded-full opacity-60 hover:opacity-100"
                          />
                          :
                          <TiArrowRight size={20} className="transform -rotate-45" />
                        }
                      </a>
                    )}
                    <AddToken token_data={props.row.original} />
                  </div>
                ),
              },
              {
                Header: 'Chain',
                accessor: 'chain_data.name',
                sortType: (a, b) => chainName(a.original.chain) > chainName(b.original.chain_data) ? 1 : -1,
                Cell: props => (
                  <Link href={`/${props.row.original.chain_data?.id || ''}`}>
                    <a className="min-w-max flex items-center space-x-2">
                      {props.row.original.chain_data?.image && (
                        <Image
                          src={props.row.original.chain_data.image}
                          alt=""
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      )}
                      <div className="text-sm font-semibold">
                        {props.value}
                      </div>
                    </a>
                  </Link>
                ),
              },
              {
                Header: 'Liquidity',
                accessor: 'amount',
                sortType: (a, b) => a.original.value > b.original.value ? 1 : a.original.value < b.original.value ? -1 : a.original.amount > b.original.amount ? 1 : -1,
                Cell: props => (
                  typeof props.value === 'number' ?
                    <div className="flex flex-col items-end space-y-0.5 -mt-0.5">
                      <span className="text-base font-bold">
                        {number_format(props.value, props.value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                      <span className="font-mono uppercase text-slate-400 dark:text-slate-500 text-xs font-semibold">
                        {currency_symbol}{number_format(props.row.original.value, props.row.original.value > 100000 ? '0,0.00a' : props.row.original.value > 1000 ? '0,0' : '0,0.00')}
                      </span>
                    </div>
                    :
                    <div className="flex flex-col items-end space-y-2">
                      <div className="skeleton w-24 h-5" />
                      <div className="skeleton w-24 h-4" />
                    </div>
                ),
                headerClassName: 'whitespace-nowrap justify-end text-right',
              },
            ]}
            data={assets_data_filtered_mapped}
            noPagination={assets_data_filtered_mapped.length <= 10}
            defaultPageSize={10}
            className="no-border"
          />
        </div>
        :
        <TailSpin color={loader_color(theme)} width="32" height="32" />
      }
    </div>
  )
}