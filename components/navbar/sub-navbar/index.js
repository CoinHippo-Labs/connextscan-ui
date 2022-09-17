import Link from 'next/link'
import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { IoMdCube } from 'react-icons/io'
import { HiServer } from 'react-icons/hi'
import { RiServerLine, RiCopperCoinFill } from 'react-icons/ri'
import { TiArrowRight } from 'react-icons/ti'

import Copy from '../../copy'
import EnsProfile from '../../ens-profile'
import Image from '../../image'
import { number_format, equals_ignore_case, ellipse } from '../../../lib/utils'

export default () => {
  const {
    chains,
    assets,
    _chain,
    asset_balances,
  } = useSelector(state =>
    (
      {
        chains: state.chains,
        assets: state.assets,
        _chain: state.chain,
        asset_balances: state.asset_balances,
      }
    ),
    shallowEqual,
  )
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    chain_data,
  } = { ..._chain }
  const {
    asset_balances_data,
  } = { ...asset_balances }

  const router = useRouter()
  const {
    pathname,
    query,
  } = { ...router }
  const {
    address,
    tx,
    chain,
  } = { ...query }

  const {
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
        <div className="flex items-center text-sm space-x-2">
          <div>
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
          </div>
          <Copy
            value={tx}
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
          title={<div className="text-slate-400 dark:text-slate-600 text-sm">
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
          </div>}
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
          title={<div className="text-slate-400 dark:text-slate-600 text-sm">
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
          </div>}
        />
      )
      break
    case '/[chain]':
      const _chain_data = chains_data?.find(c => equals_ignore_case(c?.id, chain))
      const {
        name,
        short_name,
        image,
      } = { ..._chain_data }

      title = (
        <div className="flex items-center space-x-3">
          {image && (
            <Image
              src={image}
              alt=""
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span>
            {
              short_name ||
              chain
            }
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
    <div className="w-full overflow-x-auto flex items-center py-2 sm:pt-4 px-2 sm:px-4">
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
      <span className="sm:ml-auto" />
      {
        !address &&
        !tx &&
        (
          <>
            {
              !chain &&
              asset_balances_data &&
              (
                <>
                  <Link href="/">
                    <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                      <IoMdCube
                        size={18}
                      />
                      <span className="space-x-1">
                        <span className="font-medium">
                          {number_format(
                            Object.keys(asset_balances_data).length,
                            '0,0',
                          )}
                        </span>
                        <span className="uppercase font-medium">
                          chains
                        </span>
                      </span>
                    </a>
                  </Link>
                  <Link href="/routers">
                    <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                      <HiServer
                        size={18}
                      />
                      <span className="space-x-1">
                        <span className="font-medium">
                          {number_format(
                            _.uniq(
                              Object.values(asset_balances_data)
                                .flatMap(v =>
                                  v?.map(_v => _v)
                                )
                                .map(a => a?.router_address?.toLowerCase())
                                .filter(a => a)
                            )
                            .length,
                            '0,0',
                          )}
                        </span>
                        <span className="uppercase font-medium">
                          routers
                        </span>
                      </span>
                    </a>
                  </Link>
                  <Link href="/">
                    <a className="flex items-center text-blue-600 dark:text-white space-x-1.5 ml-4">
                      <RiCopperCoinFill
                        size={18}
                      />
                      <span className="space-x-1">
                        <span className="font-medium">
                          {number_format(
                            _.uniq(
                              Object.values(asset_balances_data)
                                .flatMap(v =>
                                  v?.map(_v => _v)
                                )
                                .map(a => a?.asset_data?.id)
                                .filter(a => a)
                            )
                            .length,
                            '0,0',
                          )}
                        </span>
                        <span className="uppercase font-medium">
                          assets
                        </span>
                      </span>
                    </a>
                  </Link>
                </>
              )
            }
            {
              chain &&
              explorer?.url &&
              (
                <a
                  href={explorer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center text-blue-600 dark:text-white font-semibold space-x-1 ml-4"
                >
                  <span>
                    {
                      explorer.name ||
                      'Explorer'
                    }
                  </span>
                  <TiArrowRight
                    size={18}
                    className="transform -rotate-45 mt-0.5"
                  />
                </a>
              )
            }
            {
              website &&
              (
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
              )
            }
          </>
        )
      }
    </div>
  )
}