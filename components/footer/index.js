import { useSelector, shallowEqual } from 'react-redux'
import moment from 'moment'
import { FaHeart, FaDiscord } from 'react-icons/fa'
import { FaXTwitter } from 'react-icons/fa6'
import { BsTelegram, BsGithub } from 'react-icons/bs'

import Image from '../image'
import _package from '../../package.json'

export default () => {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const { dependencies } = { ..._package }

  return (
    <div className={`${theme} footer flex flex-col md:flex-row items-end space-y-2.5 sm:space-y-0 p-3 3xl:text-2xl 3xl:p-8`} style={{ height: '96px' }}>
      <div className="w-full md:w-1/2 lg:w-1/3 min-w-max flex items-center justify-center md:justify-start text-slate-400 dark:text-slate-500 font-medium space-x-2">
        <span>Built with</span>
        <a
          title="Connext Explorer"
          href={process.env.NEXT_PUBLIC_WEBSITE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center space-x-1.5"
        >
          <div className="min-w-max">
            <div className="flex dark:hidden items-center">
              <Image
                src="/logos/logo.png"
                width={20}
                height={20}
                className="3xl:w-8 3xl:h-8"
              />
            </div>
            <div className="hidden dark:flex items-center">
              <Image
                src="/logos/logo_white.png"
                width={20}
                height={20}
                className="3xl:w-8 3xl:h-8"
              />
            </div>
          </div>
          <span>Connext Protocol</span>
        </a>
        {dependencies?.['@connext/sdk-core'] && (
          <a
            href="https://github.com/connext/monorepo"
            target="_blank"
            rel="noopener noreferrer"
          >
            SDK v{dependencies['@connext/sdk-core'].replace('^', '')}
          </a>
        )}
      </div>
      <div className="hidden lg:flex w-full lg:w-1/3 flex-wrap items-center justify-center space-x-2">
        {process.env.NEXT_PUBLIC_TWITTER_USERNAME && (
          <a
            href={`https://twitter.com/${process.env.NEXT_PUBLIC_TWITTER_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaXTwitter size={20} className="3xl:w-8 3xl:h-8 text-black dark:text-white" />
          </a>
        )}
        {process.env.NEXT_PUBLIC_TELEGRAM_USERNAME && (
          <a
            href={`https://t.me/${process.env.NEXT_PUBLIC_TELEGRAM_USERNAME}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsTelegram size={20} className="3xl:w-8 3xl:h-8 text-blue-500 dark:text-white" />
          </a>
        )}
        {process.env.NEXT_PUBLIC_DISCORD_URL && (
          <a
            href={process.env.NEXT_PUBLIC_DISCORD_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <FaDiscord size={20} className="3xl:w-8 3xl:h-8 text-blue-600 dark:text-white" />
          </a>
        )}
        {process.env.NEXT_PUBLIC_GITHUB_URL && (
          <a
            href={process.env.NEXT_PUBLIC_GITHUB_URL}
            target="_blank"
            rel="noopener noreferrer"
          >
            <BsGithub size={20} className="3xl:w-8 3xl:h-8 text-black dark:text-white" />
          </a>
        )}
      </div>
      <div className="w-full md:w-1/2 lg:w-1/3 min-w-max flex items-center justify-center md:justify-end text-slate-400 dark:text-slate-500 space-x-1">
        <span>© {moment().format('YYYY')} made with</span>
        <FaHeart className="text-red-400 text-xl 3xl:text-2xl pr-0.5" />
        <span>by</span>
        <a
          href={process.env.NEXT_PUBLIC_BUILD_BY_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="font-semibold"
        >
          {process.env.NEXT_PUBLIC_BUILD_BY}
        </a>
        <span>team.</span>
      </div>
    </div>
  )
}