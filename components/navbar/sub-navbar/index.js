import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { IoMdCube } from 'react-icons/io'
import { HiServer } from 'react-icons/hi'
import { RiCopperCoinFill } from 'react-icons/ri'
import { TiArrowRight } from 'react-icons/ti'

import Copy from '../../copy'
import DecimalsFormat from '../../decimals-format'
import EnsProfile from '../../ens-profile'
import Image from '../../image'
import { getChain } from '../../../lib/object/chain'
import { ellipse } from '../../../lib/utils'

export default () => {
  const { chains, assets, router_asset_balances } = useSelector(state => ({ chains: state.chains, assets: state.assets, router_asset_balances: state.router_asset_balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { router_asset_balances_data } = { ...router_asset_balances }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { address, tx, chain } = { ...query }

  const { explorer, website } = { ...getChain(chain, chains_data) }

  let title
  let subtitle
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
      title = 'Transfer'
      break
    case '/address/[address]':
      title = (
        <EnsProfile
          address={address}
          fallback={<span>Address</span>}
        />
      )
      subtitle = (
        <Copy
          value={address}
          title={
            <div className="text-slate-400 dark:text-slate-600 text-sm">
              <span className="xl:hidden">
                {ellipse(address, 12)}
              </span>
              <span className="hidden xl:block">
                {ellipse(address, 16)}
              </span>
            </div>
          }
        />
      )
      break
    case '/router/[address]':
      title = (
        <EnsProfile
          address={address}
          fallback={<span>Address</span>}
        />
      )
      subtitle = (
        <Copy
          value={address}
          title={
            <div className="text-slate-400 dark:text-slate-600 text-sm">
              <span className="xl:hidden">
                {ellipse(address, 12)}
              </span>
              <span className="hidden xl:block">
                {ellipse(address, 16)}
              </span>
            </div>
          }
        />
      )
      break
    case '/[chain]':
      const chain_data = getChain(chain, chains_data)
      const { name, short_name, image } = { ...chain_data }
      title = (
        <div className="flex items-center space-x-3">
          {image && (
            <Image
              src={image}
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span>
            {short_name || chain}
          </span>
        </div>
      )
      subtitle = (
        <span className={`${image ? 'ml-9' : ''}`}>
          {name}
        </span>
      )
      break
    default:
      break
  }

  return (
    <div className="w-full overflow-x-auto flex items-center p-2 pt-6 sm:pt-4 sm:px-4">
      <div className="flex flex-col space-y-1">
        {title && (
          <h1 className="uppercase tracking-widest text-black dark:text-white text-sm sm:text-base font-medium">
            {title}
          </h1>
        )}
        {subtitle && (
          <h2 className="text-slate-400 dark:text-slate-600 text-sm">
            {subtitle}
          </h2>
        )}
      </div>
      <span className="ml-auto" />
      {!address && !tx && (
        <>
          {!chain && router_asset_balances_data && (
            <>
              <Link href="/">
                <div className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                  <IoMdCube size={18} />
                  <span className="space-x-1">
                    <DecimalsFormat
                      value={Object.keys(router_asset_balances_data).length}
                      className="font-medium"
                    />
                    <span className="uppercase font-medium">
                      chains
                    </span>
                  </span>
                </div>
              </Link>
              <Link href="/routers">
                <div className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                  <HiServer size={18} />
                  <span className="space-x-1">
                    <DecimalsFormat
                      value={
                        _.uniq(
                          Object.values(router_asset_balances_data)
                            .flatMap(v => v?.map(_v => _v))
                            .map(a => a?.address?.toLowerCase())
                            .filter(a => a)
                        ).length
                      }
                      className="font-medium"
                    />
                    <span className="uppercase font-medium">
                      routers
                    </span>
                  </span>
                </div>
              </Link>
              <Link href="/">
                <div className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                  <RiCopperCoinFill size={18} />
                  <span className="space-x-1">
                    <DecimalsFormat
                      value={
                        _.uniq(
                          Object.values(router_asset_balances_data)
                            .flatMap(v => v?.map(_v => _v))
                            .map(a => a?.asset_data?.id)
                            .filter(a => a)
                        ).length
                      }
                      className="font-medium"
                    />
                    <span className="uppercase font-medium">
                      assets
                    </span>
                  </span>
                </div>
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
              <span>{explorer.name || 'Explorer'}</span>
              <TiArrowRight size={18} className="transform -rotate-45 mt-0.5" />
            </a>
          )}
          {website && (
            <a
              href={website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-600 dark:text-white font-semibold space-x-1 ml-4"
            >
              <span>Website</span>
              <TiArrowRight size={18} className="transform -rotate-45 mt-0.5" />
            </a>
          )}
        </>
      )}
    </div>
  )
}