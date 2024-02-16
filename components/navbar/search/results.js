import { useEffect, useState } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Image from '../../image'
import EnsProfile from '../../profile/ens'
import { getENS, domainFromENS } from '../../../lib/api/ens'
import { getKeyType } from '../../../lib/key'
import { getChainData } from '../../../lib/object'
import { split, toArray, ellipse, getTitle, equalsIgnoreCase } from '../../../lib/utils'
import { ENS_DATA } from '../../../reducers/types'

export default ({ inputSearch, onSelect }) => {
  const dispatch = useDispatch()
  const { chains, assets, ens, router_asset_balances } = useSelector(state => ({ chains: state.chains, assets: state.assets, ens: state.ens, router_asset_balances: state.router_asset_balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }
  const { router_asset_balances_data } = { ...router_asset_balances }

  const [data, setData] = useState([])

  useEffect(
    () => {
      const getData = async () => {
        const _data = []

        const routerIds = router_asset_balances_data && _.uniq(toArray(Object.values(router_asset_balances_data).flatMap(d => toArray(d)).map(d => d.address)))
        let input = inputSearch
        let input_type = getKeyType(input)

        if (input_type !== 'ens' || input.endsWith('.eth')) {
          if (input_type) {
            const { resolvedAddress } = { ...Object.values({ ...ens_data }).find(v => equalsIgnoreCase(v.name, input)) }

            if (toArray(routerIds).includes(input.toLowerCase())) {
              input_type = 'router'
            }
            else if (resolvedAddress) {
              const { id } = { ...resolvedAddress }
              input = id
              input_type = toArray(routerIds).includes(input.toLowerCase()) ? 'router' : 'address'
            }
            else if (input_type === 'ens') {
              const domain = await domainFromENS(input, ens_data)
              const { resolvedAddress } = { ...domain }
              const { id } = { ...resolvedAddress }
              if (id) {
                input = id
                dispatch({ type: ENS_DATA, value: { [input.toLowerCase()]: domain } })
              }
              input_type = toArray(routerIds).includes(input.toLowerCase()) ? 'router' : id ? 'address' : null
            }

            if (input && input_type === 'address') {
              const addresses = toArray(input, 'lower').filter(a => !ens_data?.[a])
              const data = await getENS(addresses)
              if (data) {
                dispatch({ type: ENS_DATA, value: data })
              }
            }

            if (input_type) {
              _data.push({ name: input, group: input_type, path: `/${input_type}/${input}` })
            }
          }

          if (chains_data) {
            chains_data.forEach(d => {
              const { id } = { ...d }
              _data.push({ ...d, group: 'chain', path: `/${id}` })
            })
          }
          if (routerIds && _data.findIndex(d => d.group === 'router') < 0) {
            routerIds.forEach(id => {
              _data.push({ id, name: ens_data?.[id]?.name || id, group: 'router', path: `/router/${id}` })
            })
          }
          setData(_data)
        }
      }
      getData()
    },
    [inputSearch, chains_data, assets_data, ens_data, router_asset_balances_data],
  )

  const data_sorted = _.orderBy(
    toArray(data).filter(d => !inputSearch || d).map(d => {
      const { group } = { ...d }
      return {
        ...d,
        scores: ['tx', 'address'].includes(group) || (group === 'router' && data.filter(d => d.group === group).length < 2) ?
          [1] :
          ['short_name', 'name', 'id'].map(f =>
            split(d[f], 'lower', ' ').join(' ').startsWith(inputSearch.toLowerCase()) ?
              inputSearch.length > 1 ?
                inputSearch.length / d[f].length :
                inputSearch.length > 0 ? .1 : .5 :
              split(d[f], 'lower', ' ').join(' ').includes(inputSearch.toLowerCase()) ?
                inputSearch.length > 1 ?
                  inputSearch.length / d[f].length :
                  inputSearch.length > 0 ? .1 : .5 :
                -1
          ),
      }
    })
    .map(d => {
      const { scores } = { ...d }
      return { ...d, max_score: _.max(scores) }
    })
    .filter(d => d.max_score > 0 / 10),
    ['group', 'max_score'], ['asc', 'desc'],
  )

  return (
    <div className="max-h-96 overflow-y-scroll">
      {data_sorted.map((d, i) => {
        const { name, image, group, path } = { ...d }

        const header = group && !equalsIgnoreCase(group, data_sorted[i - 1]?.group) && (
          <div className={`text-slate-400 dark:text-slate-500 text-xs mt-${i === 0 ? 0.5 : 3} mb-2 ml-2`}>
            {getTitle(group)}
          </div>
        )
        const item = ['address', 'router'].includes(group) ?
          <EnsProfile address={name} noCopy={true} ellipseLength={16} /> :
          <div className="flex items-center space-x-2">
            {image && (
              <Image
                src={image}
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className="whitespace-nowrap text-base font-medium">
              {ellipse(name, 20)}
            </span>
          </div>
        const className = 'dropdown-item hover:bg-slate-200 dark:hover:bg-slate-700 cursor-pointer rounded flex items-center justify-between space-x-2 my-1 p-2'

        return (
          <div key={i}>
            {header}
            <div onClick={() => onSelect(path)} className={className}>
              {item}
            </div>
          </div>
        )
      })}
    </div>
  )
}