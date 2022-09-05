import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { TiArrowRight } from 'react-icons/ti'
import { FiBox } from 'react-icons/fi'
import { RiServerLine, RiCoinsLine } from 'react-icons/ri'

import Image from '../../image'
import Copy from '../../copy'
import EnsProfile from '../../ens-profile'
import { currency, currency_symbol } from '../../../lib/object/currency'
import { number_format, ellipse } from '../../../lib/utils'

export default () => {
  const { chains, assets, _chain, asset_balances } = useSelector(state => ({ chains: state.chains, assets: state.assets, _chain: state.chain, asset_balances: state.asset_balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { chain_data } = { ..._chain }
  const { asset_balances_data } = { ...asset_balances }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { address, tx, chain } = { ...query }

  const {
    token_data,
    explorer,
    website,
  } = { ...chain_data }

  let title,
    subtitle

  switch (pathname) {
    case '/':
      title = 'Overview'
      break
    case '/transfers':
      title = 'Transfers'
      break
    case '/routers':
      title = 'Routers'
      break
    case '/tx/[tx]':
      title = 'xTransfer'

      subtitle = (
        <div className="flex items-center text-sm xl:text-base space-x-2 xl:space-x-1">
          <span className="xl:hidden">
            {ellipse(
              tx,
              16,
            )}
          </span>
          <span className="hidden xl:block">
            {ellipse(
              tx,
              24,
            )}
          </span>
          <Copy
            value={tx}
            size={18}
          />
        </div>
      )
      break
    case '/address/[address]':
      title = (
        <EnsProfile
          address={address}
          fallback={<span>
            Address
          </span>}
        />
      )

      subtitle = (
        <Copy
          value={address}
          title={<span className="text-slate-400 dark:text-slate-200 text-sm xl:text-base">
            <span className="xl:hidden">
              {ellipse(
                address,
                12,
              )}
            </span>
            <span className="hidden xl:block">
              {ellipse(
                address,
                16,
              )}
            </span>
          </span>}
          size={18}
        />
      )
      break
    case '/router/[address]':
      title = (
        <EnsProfile
          address={address}
          fallback={<span>
            Router
          </span>}
        />
      )

      subtitle = (
        <Copy
          value={address}
          title={<span className="text-slate-400 dark:text-slate-200 text-sm xl:text-base">
            <span className="xl:hidden">
              {ellipse(
                address,
                12,
              )}
            </span>
            <span className="hidden xl:block">
              {ellipse(
                address,
                16,
              )}
            </span>
          </span>}
          size={18}
        />
      )
      break
    case '/[chain]':
      const _chain_data = chains_data?.find(c => c?.id === chain?.toLowerCase())

      title = (
        <div className="flex items-center space-x-3">
          {_chain_data?.image && (
            <Image
              src={_chain_data.image}
              alt=""
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span>
            {_chain_data?.short_name || chain}
          </span>
        </div>
      )

      subtitle = (
        <span className={`${_chain_data?.image ? 'ml-9' : ''}`}>
          {_chain_data?.name}
        </span>
      )
      break
    default:
      break
  }

  return (
    <div className="w-full overflow-x-auto flex items-center py-2 sm:py-3 px-2 sm:px-4">
      <div className="flex flex-col">
        {title && (
          <div className="text-base font-bold">
            {title}
          </div>
        )}
        {subtitle && (
          <div className="text-slate-400 dark:text-slate-500 text-sm">
            {subtitle}
          </div>
        )}
      </div>
      {token_data && (
        <div className="bg-slate-100 dark:bg-slate-900 rounded-lg flex items-center space-x-1.5 ml-4 py-2 px-3">
          <div className="min-w-max flex items-center space-x-1.5">
            <span className="uppercase font-bold">
              {token_data.symbol}
            </span>
          </div>
          {typeof token_data.market_data?.current_price?.[currency] === 'number' ?
            <span className="font-semibold">
              {currency_symbol}
              {number_format(
                token_data.market_data.current_price[currency],
                '0,0.00000000',
              )}
            </span> :
            <span>
              -
            </span>
          }
          {typeof token_data.market_data?.price_change_percentage_24h_in_currency?.[currency] === 'number' && (
            <span className={`text-${token_data.market_data.price_change_percentage_24h_in_currency[currency] < 0 ? 'red' : 'green'}-500 font-medium`}>
              {number_format(
                token_data.market_data.price_change_percentage_24h_in_currency[currency],
                '+0,0.000',
              )}
              %
            </span>
          )}
        </div>
      )}
      <span className="sm:ml-auto" />
      {!address && !tx && (
        <>
          {!chain && asset_balances_data && (
            <>
              <Link href="/">
                <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                  <FiBox size={18} />
                  <span className="space-x-1">
                    <span className="font-semibold">
                      {number_format(
                        Object.keys(asset_balances_data).length,
                        '0,0',
                      )}
                    </span>
                    <span className="uppercase font-semibold">
                      chains
                    </span>
                  </span>
                </a>
              </Link>
              <Link href="/routers">
                <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                  <RiServerLine size={18} />
                  <span className="space-x-1">
                    <span className="font-semibold">
                      {number_format(
                        _.uniq(
                          Object.values(asset_balances_data)
                            .flatMap(v => v?.map(_v => _v))
                            .map(a => a?.router_address?.toLowerCase())
                            .filter(a => a)
                        ).length,
                        '0,0',
                      )}
                    </span>
                    <span className="uppercase font-semibold">
                      routers
                    </span>
                  </span>
                </a>
              </Link>
              <Link href="/">
                <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                  <RiCoinsLine size={18} />
                  <span className="space-x-1">
                    <span className="font-semibold">
                      {number_format(
                        _.uniq(
                          Object.values(asset_balances_data)
                            .flatMap(v => v?.map(_v => _v))
                            .map(a => a?.asset_data?.id)
                            .filter(a => a)
                        ).length,
                        '0,0',
                      )}
                    </span>
                    <span className="uppercase font-semibold">
                      assets
                    </span>
                  </span>
                </a>
              </Link>
            </>
          )}
          {chain && explorer?.url && (
            <a
              href={explorer.url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 dark:text-white font-semibold space-x-1 ml-4"
            >
              <span>
                {explorer.name || 'Explorer'}
              </span>
              <TiArrowRight
                size={18}
                className="transform -rotate-45 mt-0.5"
              />
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 dark:text-white font-semibold space-x-1 ml-4"
            >
              <span>
                Website
              </span>
              <TiArrowRight
                size={18}
                className="transform -rotate-45 mt-0.5"
              />
            </a>
          )}
        </>
      )}
    </div>
  )
}