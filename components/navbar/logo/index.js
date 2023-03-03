import Link from 'next/link'
import { Tooltip } from '@material-tailwind/react'
import { BsArrowLeft } from 'react-icons/bs'

import Image from '../../image'

export default () => {
  return (
    <div className="logo flex flex-col items-start ml-3 mr-0.5 sm:mr-3">
      <Link
        href="/"
        className="w-full flex flex-col items-start"
      >
        <div className="min-w-max sm:mr-3">
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
              />
            </div>
          </div>
        </div>
      </Link>
      <div className="flex items-center space-x-2 ml-0 sm:ml-10">
        {/*
          <Tooltip
            placement="bottom"
            content="return back to nxtp-v1"
            className="z-50 bg-dark text-white text-xs"
          >
            <a
              href="https://v1.connextscan.io"
              className="bg-slate-200 dark:bg-slate-800 flex items-center text-blue-500 dark:text-blue-500 space-x-1 py-1 px-2"
            >
              <BsArrowLeft
                size={12}
              />
              <span className="whitespace-nowrap text-xs font-semibold">
                NXTPv1
              </span>
            </a>
          </Tooltip>
        */}
        <div className="hidden sm:block">
          {
            process.env.NEXT_PUBLIC_NETWORK === 'testnet' &&
            (
              <div className="max-w-min whitespace-nowrap lowercase text-slate-400 dark:text-slate-500 text-xs">
                {process.env.NEXT_PUBLIC_NETWORK}
              </div>
            )
          }
        </div>
      </div>
    </div>
  )
}