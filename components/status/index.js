import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import StackGrid from 'react-stack-grid'
import { IoRadioButtonOn } from 'react-icons/io5'
import { FiBox } from 'react-icons/fi'
import { MdOutlineRouter } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'

import Widget from '../widget'
import Image from '../image'
import { currency_symbol } from '../../lib/object/currency'
import { numberFormat } from '../../lib/utils'

export default function Status() {
  const { chains, chains_status, routers_status, routers_assets } = useSelector(state => ({ chains: state.chains, chains_status: state.chains_status, routers_status: state.routers_status, routers_assets: state.routers_assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { chains_status_data } = { ...chains_status }
  const { routers_status_data } = { ...routers_status }
  const { routers_assets_data } = { ...routers_assets }

  const router = useRouter()
  const { query } = { ...router }
  const { all } = { ...query }

  const [timer, setTimer] = useState(null)

  useEffect(() => {
    const run = async () => setTimer(moment().unix())
    if (!timer) {
      run()
    }
    const interval = setInterval(() => run(), 0.5 * 1000)
    return () => clearInterval(interval)
  }, [timer])

  const chainsStatus = chains_data?.filter(c => !c?.disabled).map(c => {
    const routers = routers_assets_data?.filter(r => ['true'].includes(all) || _.sumBy(r?.asset_balances || [], 'amount_value') > 1)

    return {
      ...c,
      ...chains_status_data?.find(_c => _c?.chain_id === c?.chain_id),
      amount_value: _.sumBy(routers?.flatMap(r => r?.asset_balances.filter(ab => ab?.chain?.chain_id === c?.chain_id) || []) || [], 'amount_value'),
      volume_value: _.sumBy(routers?.flatMap(r => r?.asset_balances.filter(ab => ab?.chain?.chain_id === c?.chain_id) || []) || [], 'volume_value'),
      routers: routers_status_data?.filter(r => r?.supportedChains?.includes(c?.chain_id) && routers?.findIndex(_r => _r?.router_id === r.routerAddress?.toLowerCase()) > -1),
    }
  })

  const chainsStatusComponent = chainsStatus?.map((cs, i) => (
    <Widget
      key={i}
      title={<Link href={`/${cs.id}`}>
        <a className="text-black dark:text-white text-xs font-semibold">
          {cs.title}
        </a>
      </Link>}
      right={chains_status_data ?
        <div className="flex items-center text-xs space-x-1.5">
          <IoRadioButtonOn size={14} className={`${!cs.synced ? 'text-red-500 dark:text-red-600' : 'text-green-600 dark:text-green-500'}`} />
          <span className={`capitalize ${!cs.synced ? 'text-red-500 dark:text-red-600' : 'text-green-600 dark:text-green-500'}`}>
            {!cs.synced ? 'unsynced' : 'synced'}
          </span>
        </div>
        :
        <div className="skeleton w-20 h-5" />
      }
      className="border-0 shadow-md rounded-2xl"
    >
      <div className="flex items-center justify-between mt-1">
        <div className="flex items-center text-2xs space-x-1.5">
          <FiBox size={16} className="mb-0.5" />
          {chains_status_data ?
            <a
              href={`${cs.explorer?.url}${cs.explorer?.block_path?.replace('{block}', cs.latestBlock)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-semibold"
            >
              {numberFormat(cs.latestBlock, '0,0')}
            </a>
            :
            <div className="skeleton w-20 h-4" />
          }
        </div>
        <div className="flex items-center text-2xs space-x-1.5">
          <FiBox size={16} className="mb-0.5" />
          {chains_status_data ?
            <a
              href={`${cs.explorer?.url}${cs.explorer?.block_path?.replace('{block}', cs.syncedBlock)}`}
              target="_blank"
              rel="noopener noreferrer"
              className="font-mono font-semibold"
            >
              {numberFormat(cs.syncedBlock, '0,0')}
            </a>
            :
            <div className="skeleton w-20 h-4" />
          }
        </div>
      </div>
      <div className="flex items-center justify-center my-4">
        <Link href={`/${cs.id}`}>
          <a>
            <Image
              src={cs.image}
              alt=""
              className="w-16 h-16 rounded-full"
            />
          </a>
        </Link>
      </div>
      <div className="flex items-center justify-between mt-1.5">
        <div className="flex items-center space-x-1.5">
          <span className="text-gray-400 dark:text-gray-500 text-xs">Volume:</span>
          {routers_assets_data ?
            <span className="font-mono uppercase text-xs font-semibold">
              {currency_symbol}{numberFormat(cs.volume_value, cs.volume_value > 10000000 ? '0,0.00a' : '0,0')}
            </span>
            :
            <div className="skeleton w-16 h-4" />
          }
        </div>
        <div className="flex items-center text-sm space-x-1.5">
          <MdOutlineRouter size={18} className="text-gray-400 dark:text-gray-500 mb-0.5" />
          {routers_status_data ?
            <span className="font-mono text-xs font-semibold">
              {numberFormat(cs.routers?.length, '0,0')}
            </span>
            :
            <div className="skeleton w-6 h-4" />
          }
          <span className="text-gray-400 dark:text-gray-500">Router{!routers_status_data || cs.routers?.length > 1 ? 's' : ''}</span>
        </div>
      </div>
      <div className="flex items-center justify-between mt-0.5">
        <div className="flex items-center text-sm space-x-1.5">
          <span className="text-gray-400 dark:text-gray-500 text-xs">Liquidity:</span>
          {routers_assets_data ?
            <span className="font-mono uppercase text-xs font-semibold">
              {currency_symbol}{numberFormat(cs.amount_value, cs.amount_value > 10000000 ? '0,0.00a' : '0,0')}
            </span>
            :
            <div className="skeleton w-16 h-4" />
          }
        </div>
        <Link href={`/${cs.id}`}>
          <a className="flex items-center text-blue-600 dark:text-blue-500 text-xs">
            <span>Liquidity</span>
            <TiArrowRight size={16} className="transform -rotate-45 -mr-0.5" />
          </a>
        </Link>
      </div>
    </Widget>
  ))

  return (
    <>
      <StackGrid
        columnWidth={280}
        gutterWidth={16}
        gutterHeight={16}
        className="hidden sm:block"
      >
        {chainsStatusComponent}
      </StackGrid>
      <div className="block sm:hidden space-y-3">
        {chainsStatusComponent}
      </div>
    </>
  )
}