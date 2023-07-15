import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { IoMdCube } from 'react-icons/io'
import { HiServer } from 'react-icons/hi'
import { RiCopperCoinFill } from 'react-icons/ri'
import { TiArrowRight } from 'react-icons/ti'

import NumberDisplay from '../../number'
import EnsProfile from '../../profile/ens'
import Copy from '../../copy'
import Image from '../../image'
import { getChainData } from '../../../lib/object'
import { toArray } from '../../../lib/utils'

export default () => {
  const { chains, router_asset_balances } = useSelector(state => ({ chains: state.chains, router_asset_balances: state.router_asset_balances }), shallowEqual)
  const { chains_data } = { ...chains }
  const { router_asset_balances_data } = { ...router_asset_balances }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { address, tx, chain } = { ...query }

  const { explorer } = { ...getChainData(chain, chains_data) }
  const { name, url } = { ...explorer }

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
    case '/router/[address]':
    case '/address/[address]':
      title = <EnsProfile address={address} />
      break
    case '/[chain]':
      const { name, image } = { ...getChainData(chain, chains_data) }
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
          <span>{name}</span>
        </div>
      )
      break
    default:
      break
  }

  return (
    <div className="w-full overflow-x-auto flex items-center pt-6 sm:pt-4 pb-2 px-2 sm:px-4">
      <div className="flex flex-col space-y-1">
        {title && (
          <h1 className="uppercase text-black dark:text-white text-sm sm:text-base font-semibold">
            {title}
          </h1>
        )}
        {subtitle && (
          <h2 className="text-slate-400 dark:text-slate-500 text-sm">
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
                <div className="flex items-center text-blue-500 dark:text-white space-x-1.5 ml-4">
                  <IoMdCube size={18} />
                  <NumberDisplay
                    value={Object.keys(router_asset_balances_data).length}
                    suffix=" chains"
                    className="uppercase whitespace-nowrap font-medium"
                  />
                </div>
              </Link>
              <Link href="/routers">
                <div className="flex items-center text-blue-500 dark:text-white space-x-1.5 ml-4">
                  <HiServer size={18} />
                  <NumberDisplay
                    value={_.uniq(toArray(Object.values(router_asset_balances_data).flatMap(d => toArray(d)).map(d => d.address?.toLowerCase()))).length}
                    suffix=" routers"
                    className="uppercase whitespace-nowrap font-medium"
                  />
                </div>
              </Link>
              <Link href="/">
                <div className="flex items-center text-blue-500 dark:text-white space-x-1.5 ml-4">
                  <RiCopperCoinFill size={18} />
                  <NumberDisplay
                    value={_.uniq(toArray(Object.values(router_asset_balances_data).flatMap(d => toArray(d)).map(d => d.asset_data?.id))).length}
                    suffix=" assets"
                    className="uppercase whitespace-nowrap font-medium"
                  />
                </div>
              </Link>
            </>
          )}
          {url && (
            <a
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center text-blue-500 dark:text-white space-x-1 ml-4"
            >
              <span className="font-semibold">
                {name || 'Explorer'}
              </span>
              <TiArrowRight size={18} className="transform -rotate-45 mt-0.5" />
            </a>
          )}
        </>
      )}
    </div>
  )
}