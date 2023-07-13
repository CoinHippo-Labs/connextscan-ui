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
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'

import { chainName, getChainData, getPoolData } from '../../lib/object'
import { isNumber } from '../../lib/number'
import { toArray, ellipse } from '../../lib/utils'

export default () => {
  const { chains, assets, pools } = useSelector(state => ({ chains: state.chains, assets: state.assets, pools: state.pools }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pools_data } = { ...pools }

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

  const _pools_data = _.orderBy(
    toArray(getPoolData(undefined, pools_data, { chain_id, return_all: true })).filter(d => !assetSelect || d.asset_data?.id === assetSelect).map((d, i) => {
      return { ...d, i }
    }),
    ['tvl'], ['desc'],
  )

  return (
    <div className="space-y-2">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="whitespace-nowrap uppercase text-sm font-semibold">
          Pools Liquidity
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
      {pools_data ?
        <Datatable
          columns={[
            {
              Header: '#',
              accessor: 'i',
              sortType: (a, b) => a.original.i > b.original.i ? 1 : -1,
              Cell: props => (
                <span className="text-black dark:text-white font-medium">
                  {(props.flatRows?.indexOf(props.row) > -1 ? props.flatRows.indexOf(props.row) : props.value) + 1}
                </span>
              ),
            },
            {
              Header: 'Pool',
              accessor: 'name',
              sortType: (a, b) => a.original.name > b.original.name ? 1 : -1,
              Cell: props => {
                const { value, row } = { ...props }
                const { symbol, chain_data, asset_data } = { ...row.original }
                const { id } = { ...chain_data }
                const { image } = { ...asset_data }
                return (
                  <a
                    href={`${process.env.NEXT_PUBLIC_BRIDGE_URL}/pool/${asset_data?.symbol && id ? `${asset_data.symbol.toUpperCase()}-on-${id}` : ''}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
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
                          {symbol}
                        </div>
                      </div>
                    </div>
                  </a>
                )
              },
            },
            {
              Header: 'Address',
              accessor: 'lpTokenAddress',
              disableSortBy: true,
              Cell: props => {
                const { value, row } = { ...props }
                const { chain_data } = { ...row.original }
                const { explorer } = { ...chain_data }
                return value && (
                  <div className="min-w-max flex items-center space-x-1.5 -mt-1">
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
              accessor: 'tvl',
              sortType: (a, b) => a.original.tvl > b.original.tvl ? 1 : -1,
              Cell: props => {
                const { value, row } = { ...props }
                const { chain_data, asset_data } = { ...row.original }
                const { id } = { ...chain_data }
                const { symbol } = { ...asset_data }
                return (
                  isNumber(value) ?
                    <a
                      href={`${process.env.NEXT_PUBLIC_BRIDGE_URL}/pool/${symbol && id ? `${symbol.toUpperCase()}-on-${id}` : ''}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex flex-col items-end -mt-0.5"
                    >
                      <NumberDisplay
                        value={value}
                        prefix="$"
                        noTooltip={true}
                        className="text-base font-bold"
                      />
                    </a> :
                    <div className="flex items-center justify-end">
                      <Spinner />
                    </div>
                )
              },
              headerClassName: 'justify-end whitespace-nowrap text-right',
            },
          ].filter(c => !chain || !['chain_data.name'].includes(c.accessor))}
          size="small"
          data={_pools_data}
          defaultPageSize={10}
          noPagination={_pools_data.length <= 10}
          className="no-border no-shadow"
        /> :
        <Spinner width={32} height={32} />
      }
    </div>
  )
}