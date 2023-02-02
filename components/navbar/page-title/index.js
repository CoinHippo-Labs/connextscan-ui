import { useRouter } from 'next/router'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import moment from 'moment'
import { Oval } from 'react-loader-spinner'
import { MdRefresh } from 'react-icons/md'
import { RiFileCodeLine } from 'react-icons/ri'

import SectionTitle from '../../section-title'
import Copy from '../../copy'
import Image from '../../image'
import { ellipseAddress } from '../../../lib/utils'

import { ROUTERS_STATUS_TRIGGER } from '../../../reducers/types'

export default function PageTitle() {
  const dispatch = useDispatch()
  const { preferences, chains, ens, routers_status } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, ens: state.ens, routers_status: state.routers_status }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { ens_data } = { ...ens }
  const { routers_status_data } = { ...routers_status }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { address, tx, blockchain_id } = { ...query }

  let title, subtitle, right

  switch (pathname) {
    case '/':
      title = 'Overview'
      subtitle = 'Dashboard'
      break
    case '/routers':
      title = 'List of routers'
      subtitle = 'Routers'
      break
    case '/leaderboard/routers':
      title = 'Routers'
      subtitle = 'Leaderboard'
      right = (
        <button
          disabled={!routers_status_data}
          onClick={() => {
           dispatch({
              type: ROUTERS_STATUS_TRIGGER,
              value: moment().valueOf(),
            })
          }}
          className={`hover:bg-gray-100 dark:hover:bg-gray-900 ${!routers_status_data ? 'cursor-not-allowed text-gray-800 dark:text-gray-200' : ''} rounded-xl flex items-center font-medium space-x-1 -mr-2 py-1.5 px-2`}
        >
          {routers_status_data ?
            <MdRefresh size={16} />
            :
            <Oval color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
          }
          <span>{routers_status_data ? 'Refresh' : 'Loading'}</span>
        </button>
      )
      break
    case '/transactions':
      title = 'Latest'
      subtitle = 'Transactions'
      break
    case '/status':
      title = 'Supported Chains'
      subtitle = 'Status'
      break
    case '/tx/[tx]':
      title = 'Transaction'
      subtitle = (
        <div className="flex items-center space-x-2 xl:space-x-0">
          <span className="xl:hidden uppercase text-sm xl:text-lg">
            {ellipseAddress(tx, 16)}
          </span>
          <span className="hidden xl:block uppercase text-sm xl:text-lg xl:pr-2">
            {ellipseAddress(tx, 24)}
          </span>
          <Copy size={20} text={tx} />
        </div>
      )
      break
    case '/router/[address]':
      const routerStatus = routers_status_data?.find(r => r?.routerAddress?.toLowerCase() === address?.toLowerCase())

      title = (
        <span className="flex flex-wrap items-center">
          <span className="mr-2">Router</span>
          {ens_data?.[address?.toLowerCase()]?.name && (
            <div className="flex items-center mr-2">
              <Image
                src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[address.toLowerCase()].name}`}
                alt=""
                className="w-6 h-6 rounded-full mr-2"
              />
              <span className="normal-case text-black dark:text-white text-base font-semibold mb-0.5">
                {ellipseAddress(ens_data[address.toLowerCase()].name, 16)}
              </span>
            </div>
          )}
          {routerStatus?.isRouterContract && (
            <div className="max-w-min bg-blue-600 dark:bg-blue-500 rounded-lg capitalize flex items-center text-white text-xs space-x-1 mb-0.5 py-1 px-2">
              <RiFileCodeLine size={16} className="-ml-0.5" />
              <span className="font-medium">Contract</span>
            </div>
          )}
        </span>
      )
      subtitle = (
        <Copy
          size={18}
          text={address}
          copyTitle={<span className="text-gray-400 dark:text-gray-600 font-normal">
            <span className="xl:hidden text-base">
              {ellipseAddress(address, 12)}
            </span>
            <span className="hidden xl:block text-sm">
              {ellipseAddress(address, 16)}
            </span>
          </span>}
        />
      )
      right = routerStatus && (
        <div className="sm:text-right">
          <div className="uppercase text-gray-400 dark:text-gray-600 text-sm sm:text-xs font-medium">Supported Chains</div>
          <div className="max-w-md flex flex-wrap items-center sm:justify-end mt-2">
            {routerStatus.supportedChains?.length > 0 ?
              chains_data && routerStatus.supportedChains.map((id, i) => (
                <Image
                  key={i}
                  src={chains_data.find(c => c?.chain_id === id)?.image}
                  alt=""
                  className="w-5 sm:w-6 h-5 sm:h-6 rounded-full mb-2 ml-0 sm:ml-2 mr-2 sm:mr-0"
                />
              ))
              :
              <span>-</span>
            }
          </div>
        </div>
      )
      break
    case '/address/[address]':
      title = (
        <span className="flex flex-wrap items-center">
          <span className="mr-2">Address</span>
          {ens_data?.[address?.toLowerCase()]?.name && (
            <div className="flex items-center">
              <Image
                src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[address.toLowerCase()].name}`}
                alt=""
                className="w-6 h-6 rounded-full mr-2"
              />
              <span className="normal-case text-black dark:text-white text-base font-semibold mb-0.5">
                {ellipseAddress(ens_data[address.toLowerCase()].name, 16)}
              </span>
            </div>
          )}
        </span>
      )
      subtitle = (
        <Copy
          size={18}
          text={address}
          copyTitle={<span className="text-gray-400 dark:text-gray-600 font-normal">
            <span className="xl:hidden text-base">
              {ellipseAddress(address, 12)}
            </span>
            <span className="hidden xl:block text-sm">
              {ellipseAddress(address, 16)}
            </span>
          </span>}
        />
      )
      break
    case '/[blockchain_id]':
      const chain = chains_data?.find(c => c?.id === blockchain_id?.toLowerCase())

      title = chain?.title || 'chain'
      subtitle = (
        <div className="flex items-center space-x-2">
          <Image
            src={chain?.image}
            alt=""
            className="w-8 h-8 rounded-full"
          />
          <span>{chain?.short_name || blockchain_id}</span>
        </div>
      )
      break
    default:
      break
  }

  return (
    <SectionTitle
      title={title}
      subtitle={<div className="mt-1">{subtitle}</div>}
      right={right}
      className="flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 px-2 sm:px-4"
    />
  )
}