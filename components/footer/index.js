import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import moment from 'moment'
import { FaHeart } from 'react-icons/fa'

import Image from '../image'
import _package from '../../package.json'

export default function Footer() {
  const { preferences, chains } = useSelector(state => ({ preferences: state.preferences, chains: state.chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }

  return (
    <div className={`footer flex flex-col md:flex-row items-center text-xs font-light space-y-2 sm:space-y-0 p-3 ${theme}`}>
      <span className="w-full md:w-1/2 lg:w-1/4 flex items-center justify-center md:justify-start text-gray-400">
        <div className="min-w-max flex items-center text-gray-600 dark:text-white font-medium space-x-1.5">
          <span>Built with</span>
          <a
            title="build cross chain apps"
            href={process.env.NEXT_PUBLIC_PROTOCOL_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center space-x-1.5"
          >
            <Image
              src="/logos/logo.png"
              alt=""
              className="w-4 h-4 rounded-full"
            />
            <span>Connext Protocol</span>
          </a>
          {_package?.dependencies?.['@connext/nxtp-sdk'] && (
            <span className="font-mono text-gray-400 dark:text-gray-600 font-light">(SDK v{_package.dependencies['@connext/nxtp-sdk'].replace('^', '')})</span>
          )}
        </div>
      </span>
      <span className="hidden lg:flex w-full lg:w-2/4 flex-wrap items-center justify-center">
        <span className="leading-3 uppercase text-gray-400 dark:text-gray-600 text-2xs font-light mr-2 sm:mr-2.5">Supported</span>
        {chains_data?.map((c, i) => (
          <Link key={i} href={`/${c?.id}`}>
            <a className="mr-1.5 sm:mr-2">
              <Image
                src={c?.image}
                alt=""
                className="w-4 sm:w-5 h-4 sm:h-5"
              />
            </a>
          </Link>
        ))}
      </span>
      <span className="w-full md:w-1/2 lg:w-1/4 min-w-max flex items-center justify-center md:justify-end text-gray-400 space-x-1">
        <span>© {moment().format('YYYY')} made with</span>
        <FaHeart className="text-red-400 text-xl pr-0.5" />
        <span>
          {"by "}
          <a
            href={process.env.NEXT_PUBLIC_TEAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-500 dark:text-white font-semibold"
          >
            {process.env.NEXT_PUBLIC_TEAM_NAME}
          </a>
          {" team."}
        </span>
      </span>
    </div>
  )
}