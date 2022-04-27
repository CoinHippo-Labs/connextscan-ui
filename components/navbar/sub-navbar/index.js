import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { Img } from 'react-image'
import { TiArrowRight } from 'react-icons/ti'
import { FiBox } from 'react-icons/fi'
import { MdOutlineRouter } from 'react-icons/md'
import { RiFileCodeLine, RiCoinsLine } from 'react-icons/ri'

import Copy from '../../copy'
import EnsProfile from '../../ens-profile'
import { currency, currency_symbol } from '../../../lib/object/currency'
import { number_format, ellipse } from '../../../lib/utils'

export default function SubNavbar() {
  const { chains, assets, _chain, routers_status, asset_balances, routers_assets } = useSelector(state => ({ chains: state.chains, assets: state.assets, _chain: state.chain, routers_status: state.routers_status, asset_balances: state.asset_balances, routers_assets: state.routers_assets }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { chain_data } = { ..._chain }
  const { routers_status_data } = { ...routers_status }
  const { asset_balances_data } = { ...asset_balances }
  const { routers_assets_data } = { ...routers_assets }

  const router = useRouter()
  const { query } = { ...router }
  const { address, tx, chain } = { ...query }

  const { token_data } = { ...chain_data }
  let title, subtitle
  switch (pathname) {
    case '/':
      title = 'Overview'
      break
    case '/transactions':
      title = 'Transactions'
      break
    case '/routers':
      title = 'Routers'
      break
    case '/leaderboard/routers':
      title = 'Leaderboard'
      subtitle = 'Routers'
      break
    case '/status':
      title = 'Status'
      break
    case '/tx/[tx]':
      title = 'Transaction'
      subtitle = (
        <div className="flex items-center text-sm xl:text-base space-x-2 xl:space-x-1">
          <span className="xl:hidden">
            {ellipse(tx, 16)}
          </span>
          <span className="hidden xl:block">
            {ellipse(tx, 24)}
          </span>
          <Copy value={tx} size={18} />
        </div>
      )
      break
    case '/address/[address]':
      title = (<EnsProfile address={address} />) || 'Address'
      subtitle = (
        <Copy
          value={address}
          title={<span className="text-sm xl:text-base text-gray-400 dark:text-gray-200">
            <span className="xl:hidden">
              {ellipse(address, 12)}
            </span>
            <span className="hidden xl:block">
              {ellipse(address, 16)}
            </span>
          </span>}
          size={18}
        />
      )
      break
    case '/router/[address]':
      const routerStatus = routers_status_data?.find(r => r?.routerAddress?.toLowerCase() === address?.toLowerCase())
      title = (<EnsProfile address={address} />) || (<span>Router</span>)
      title = (
        <div className="flex flex-wrap items-center space-x-2">
          {title}
          {routerStatus?.isRouterContract && (
            <div className="max-w-min bg-blue-600 dark:bg-blue-500 rounded-lg capitalize flex items-center text-white text-xs space-x-1 py-1 px-2">
              <RiFileCodeLine size={16} className="-ml-0.5" />
              <span className="font-medium">Contract</span>
            </div>
          )}
        </div>
      )
      subtitle = (
        <Copy
          value={address}
          title={<span className="text-sm xl:text-base text-gray-400 dark:text-gray-200">
            <span className="xl:hidden">
              {ellipse(address, 12)}
            </span>
            <span className="hidden xl:block">
              {ellipse(address, 16)}
            </span>
          </span>}
          size={18}
        />
      )
      break
    case '/[chain]':
      const _chain_data = chains_data?.find(c => c?.id === chain?.toLowerCase())
      title = (
        <div className="flex items-center space-x-2">
          <Img
            src={chain?.image}
            alt=""
            className="w-8 h-8 rounded-full"
          />
          <span>{_chain_data?.short_name || chain}</span>
        </div>
      )
      subtitle = _chain_data?.name
      break
    default:
      break
  }

  return (
    <div className="w-full overflow-x-auto flex items-center py-2 sm:py-3 px-2 sm:px-4">
      <div className="flex flex-col space-y-1">
        {title && (
          <div className="text-base font-bold">
            {title}
          </div>
        )}
        {subtitle && (
          <div className="text-sm text-gray-400 dark:text-gray-600">
            {subtitle}
          </div>
        )}
      </div>
      {token_data && (
        <div className="flex items-center space-x-1.5 mr-4">
          <div className="min-w-max flex items-center space-x-1.5">
            <Img
              src={token_data.image?.thumb}
              alt=""
              className="w-5 h-5"
            />
            <span className="uppercase font-semibold">{token_data.symbol}</span>
          </div>
          {typeof token_data.market_data?.current_price?.[currency] === 'number' ?
            <span className="font-mono font-semibold">
              {currency_symbol}{number_format(token_data.market_data.current_price[currency], '0,0.00000000')}
            </span>
            :
            <span>-</span>
          }
          {typeof token_data.market_data?.price_change_percentage_24h_in_currency?.[currency] === 'number' && (
            <span className={`text-${token_data.market_data.price_change_percentage_24h_in_currency[currency] < 0 ? 'red' : 'green'}-500 font-medium`}>
              {number_format(token_data.market_data.price_change_percentage_24h_in_currency[currency], '+0,0.000')}%
            </span>
          )}
        </div>
      )}
      <span className="sm:ml-auto" />
      {asset_balances_data && (
        <>
          <Link href="/status">
            <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
              <FiBox size={18} />
              <span className="space-x-1">
                <span className="font-mono font-semibold">
                  {number_format(Object.keys(asset_balances_data).length, '0,0')}
                </span>
                <span className="uppercase font-semibold">chains</span>
              </span>
            </a>
          </Link>
          <Link href="/leaderboard/routers">
            <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
              <MdOutlineRouter size={18} />
              <span className="space-x-1">
                <span className="font-mono font-semibold">
                  {number_format(routers_assets_data?.filter(r => _.sumBy(r?.asset_balances, 'amount_value') > 1).length, '0,0')}
                </span>
                <span className="uppercase font-semibold">routers</span>
              </span>
            </a>
          </Link>
          <Link href="/routers">
            <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
              <RiCoinsLine size={18} />
              <span className="space-x-1">
                <span className="font-mono font-semibold">
                  {number_format(_.uniq(Object.values(asset_balances_data).flatMap(v => v?.map(_v => _v)).filter(a => a?.asset_data?.id)).length, '0,0')}
                </span>
                <span className="uppercase font-semibold">assets</span>
              </span>
            </a>
          </Link>
        </>
      )}
      {chain_data?.explorer?.url && (
        <a
          href={chain_data.explorer.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-blue-600 dark:text-white font-semibold ml-4"
        >
          <span>{chain_data.explorer.name || 'Explorer'}</span>
          <TiArrowRight size={18} className="transform -rotate-45" />
        </a>
      )}
      {chain_data?.website && (
        <a
          href={chain_data.website}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center text-blue-600 dark:text-white font-semibold ml-4"
        >
          <span>Website</span>
          <TiArrowRight size={18} className="transform -rotate-45" />
        </a>
      )}
    </div>
  )
}