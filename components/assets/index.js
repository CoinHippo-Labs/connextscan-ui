import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Spinner from '../spinner'
import Datatable from '../datatable'
import NumberDisplay from '../number'
import Copy from '../copy'
import Image from '../image'
import ExplorerLink from '../explorer/link'
import AddMetamask from '../metamask/add-button'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'

import { WRAPPED_PREFIX } from '../../lib/config'
import { chainName, getChainData, getAssetData, getContractData } from '../../lib/object'
import { isNumber } from '../../lib/number'
import { toArray, capitalize, ellipse, equalsIgnoreCase } from '../../lib/utils'

export default ({ data }) => {
  const { chains, assets } = useSelector(state => ({ chains: state.chains, assets: state.assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }

  const router = useRouter()
  const { query } = { ...router }
  const { chain } = { ...query }

  const [chainSelected, setChainSelected] = useState('')
  const [assetSelected, setAssetSelected] = useState('')

  useEffect(
    () => {
      if (chain) {
        setChainSelected(chain)
      }
    },
    [chain],
  )

  const chain_data = getChainData(chainSelected, chains_data)
  const { chain_id } = { ...chain_data }

  const _assets_data = toArray(getAssetData(assetSelected, assets_data, { chain_id, return_all: true })).flatMap(d =>
    toArray(d.contracts).filter(c => getChainData(c.chain_id, chains_data) && (!chain_data || getContractData(c.chain_id, d.contracts)?.chain_id === chain_id)).map((c, i) => {
      let asset_data = { ...d, ...c, i, chain_data: getChainData(c.chain_id, chains_data) }
      if (asset_data.contracts) {
        delete asset_data.contracts
      }
      const { chain_id, contract_address, xERC20, next_asset, price } = { ...asset_data }
      const contract_addresses = toArray([next_asset?.contract_address, xERC20, contract_address])
      const _data = toArray(data).filter(d => d.chain_id === chain_id && contract_addresses.findIndex(a => equalsIgnoreCase(d.contract_address, a)) > -1)
      const contract_data = _.head(_data)
      if (next_asset && (!contract_data?.contract_address || equalsIgnoreCase(contract_data.contract_address, next_asset.contract_address))) {
        asset_data = { ...asset_data, ...next_asset }
        delete asset_data.next_asset
      }
      if (xERC20) {
        asset_data = { ...asset_data, contract_address: xERC20 }
        delete asset_data.next_asset
      }
      const amount = _.sumBy(_data.map(d => { return { ...d, amount: Number(d.amount) } }), 'amount')
      const value = amount * (price || 0)
      return { ...asset_data, amount, value }
    })
  )

  return (
    <div className="space-y-2">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="whitespace-nowrap uppercase text-sm font-bold">
          Routers Liquidity
        </div>
        <div className="flex items-center space-x-2 mt-2 sm:mt-0 mb-4 sm:mb-0">
          {!chain && <SelectChain value={chainSelected} onSelect={c => setChainSelected(c)} />}
          <SelectAsset
            value={assetSelected}
            onSelect={a => setAssetSelected(a)}
            chain={chainSelected}
          />
        </div>
      </div>
      {assets_data ?
        <Datatable
          columns={[
            {
              Header: '#',
              accessor: 'i',
              disableSortBy: true,
              Cell: props => (
                <span className="text-black dark:text-white font-medium">
                  {props.flatRows?.indexOf(props.row) + 1}
                </span>
              ),
            },
            {
              Header: 'Asset',
              accessor: 'symbol',
              sortType: (a, b) => a.original.symbol > b.original.symbol ? 1 : -1,
              Cell: props => {
                const { value, row } = { ...props }
                const { name, image } = { ...row.original }
                return (
                  <div className="min-w-max flex items-start space-x-2 -mt-0.5">
                    {image && (
                      <Image
                        src={image}
                        width={24}
                        height={24}
                        className="rounded-full"
                      />
                    )}
                    <div className="space-y-0.5">
                      <div className="text-base font-semibold">
                        {value}
                      </div>
                      <div className="whitespace-nowrap text-slate-400 dark:text-slate-500 text-xs">
                        {value?.startsWith(WRAPPED_PREFIX) ? `${capitalize(WRAPPED_PREFIX)} ` : ''}{name}
                      </div>
                    </div>
                  </div>
                )
              },
            },
            {
              Header: 'Address',
              accessor: 'contract_address',
              disableSortBy: true,
              Cell: props => {
                const { value, row } = { ...props }
                const { id, chain_data } = { ...row.original }
                const { explorer } = { ...chain_data }
                return value && (
                  <div className="min-w-max flex items-center space-x-1.5">
                    <Copy
                      size={20}
                      value={value}
                      title={chain && (
                        <span className="text-slate-400 dark:text-slate-200 text-sm">
                          <span className="xl:hidden">
                            {ellipse(value, 8)}
                          </span>
                          <span className="hidden xl:block">
                            {ellipse(value, 12)}
                          </span>
                        </span>
                      )}
                    />
                    <ExplorerLink
                      value={value}
                      explorer={explorer}
                      width={20}
                      height={20}
                    />
                    <AddMetamask
                      chain={chain_data?.id}
                      asset={id}
                      address={value}
                    />
                  </div>
                )
              },
            },
            {
              Header: 'Chain',
              accessor: 'chain_data.name',
              sortType: (a, b) => chainName(a.original.chain_data) > chainName(b.original.chain_data) ? 1 : -1,
              Cell: props => {
                const { value, row } = { ...props }
                const { chain_data } = { ...row.original }
                const { id, image } = { ...chain_data }
                return (
                  <Link href={`/${id || ''}`}>
                    <div className="min-w-max flex items-center space-x-2">
                      {image && (
                        <Image
                          src={image}
                          width={20}
                          height={20}
                          className="rounded-full"
                        />
                      )}
                      <div className="text-sm font-semibold">
                        {value}
                      </div>
                    </div>
                  </Link>
                )
              },
            },
            {
              Header: 'Liquidity',
              accessor: 'amount',
              sortType: (a, b) => a.original.value > b.original.value ? 1 : a.original.value < b.original.value ? -1 : a.original.amount > b.original.amount ? 1 : -1,
              Cell: props => {
                const { row } = { ...props }
                const { amount, value } = { ...row.original }
                return (
                  isNumber(amount) ?
                    <div className="flex flex-col items-end space-y-0.5 -mt-0.5">
                      <NumberDisplay value={amount} className="text-base font-bold" />
                      <NumberDisplay
                        value={value}
                        prefix="$"
                        className="text-slate-400 dark:text-slate-500 text-xs font-semibold"
                      />
                    </div> :
                    <div className="flex items-center justify-end">
                      <Spinner />
                    </div>
                )
              },
              headerClassName: 'justify-end whitespace-nowrap text-right',
            },
          ].filter(c => !chain || !['chain_data.name'].includes(c.accessor))}
          size="small"
          data={_assets_data}
          defaultPageSize={10}
          noPagination={_assets_data.length <= 10}
          className="no-border no-shadow"
        /> :
        <div className="loading">
          <Spinner width={32} height={32} />
        </div>
      }
    </div>
  )
}