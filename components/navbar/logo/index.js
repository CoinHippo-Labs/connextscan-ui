import Link from 'next/link'

import Image from '../../image'
import { NETWORK } from '../../../lib/config'

export default () => {
  return (
    <div className="logo flex flex-col items-start ml-3 mr-0.5 sm:mr-3 3xl:mx-6">
      <Link href="/">
        <div className="min-w-max flex items-center space-x-1 sm:mr-3">
          <div className="flex dark:hidden items-center">
            <div className="flex sm:hidden">
              <Image
                src="/logos/logo.png"
                width={32}
                height={32}
              />
            </div>
            <div className="hidden sm:flex">
              <Image
                src="/logos/logo_with_name.png"
                width={128}
                height={32}
                className="3xl:w-40 3xl:h-10"
              />
            </div>
          </div>
          <div className="hidden dark:flex items-center">
            <div className="flex sm:hidden">
              <Image
                src="/logos/logo_white.png"
                width={32}
                height={32}
              />
            </div>
            <div className="hidden sm:flex">
              <Image
                src="/logos/logo_with_name_white.png"
                width={128}
                height={32}
                className="3xl:w-40 3xl:h-10"
              />
            </div>
          </div>
        </div>
      </Link>
      <div className="flex items-center space-x-2 ml-0 sm:ml-11 3xl:ml-14">
        <div className="hidden sm:block">
          {NETWORK === 'testnet' && (
            <div className="lowercase text-slate-400 dark:text-slate-500 text-xs 3xl:text-xl">
              {NETWORK}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}