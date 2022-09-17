import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { FaHeart } from 'react-icons/fa'

import Image from '../image'
import _package from '../../package.json'

export default () => {
  const {
    preferences,
    chains,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }

  const {
    dependencies,
  } = { ..._package }

  return (
    <div className={`${theme} footer flex flex-col md:flex-row items-center space-y-2.5 sm:space-y-0 p-3`}>
      <div className="w-full md:w-1/2 lg:w-1/4 min-w-max flex items-center justify-center md:justify-start space-x-2">
        <span>
          Built with
        </span>
        <a
          title="Build Cross-Chain Apps"
          href={process.env.NEXT_PUBLIC_PROTOCOL_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5"
        >
          <div className="min-w-max">
            <div className="flex dark:hidden items-center">
              <Image
                src="/logos/logo.png"
                alt=""
                width={20}
                height={20}
              />
            </div>
            <div className="hidden dark:flex items-center">
              <Image
                src="/logos/logo_white.png"
                alt=""
                width={20}
                height={20}
              />
            </div>
          </div>
          <span>
            Connext Protocol
          </span>
        </a>
        {dependencies?.['@connext/nxtp-sdk'] && (
          <a
            href="https://github.com/connext/nxtp"
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-white text-xs font-medium"
          >
            SDK v{dependencies['@connext/nxtp-sdk'].replace('^', '')}
          </a>
        )}
      </div>
      <div className="hidden lg:flex w-full lg:w-2/4 flex-wrap items-center justify-center">
        {(chains_data || [])
          .map((c, i) => {
            const {
              id,
              image,
            } = { ...c }

            return (
              <Link
                key={i}
                href={`/${id}`}
              >
                <a className="mr-1.5 sm:mr-2">
                  <Image
                    src={image}
                    alt=""
                    width={16}
                    height={16}
                    className="w-4 sm:w-5 h-4 sm:h-5 rounded-full"
                  />
                </a>
              </Link>
            )
          })
        }
      </div>
      <div className="w-full md:w-1/2 lg:w-1/4 min-w-max flex items-center justify-center md:justify-end text-slate-400 dark:text-white space-x-1">
        <span>
          © {moment().format('YYYY')} made with
        </span>
        <FaHeart
          className="text-red-400 text-xl pr-0.5"
        />
        <span>
          {"by "}
          <a
            href={process.env.NEXT_PUBLIC_TEAM_URL}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 dark:text-white font-semibold"
          >
            {process.env.NEXT_PUBLIC_TEAM_NAME}
          </a>
          {" team."}
        </span>
      </div>
    </div>
  )
}