import Link from 'next/link'
import { useRouter } from 'next/router'

import menus from './menus'
import { toArray } from '../../../lib/utils'

export default () => {
  const router = useRouter()
  const {
    pathname,
  } = { ...router }

  return (
    <div className="hidden xl:flex items-center space-x-0 xl:space-x-2 mx-auto">
      {menus
        .filter(m => m?.path)
        .map(m => {
          const {
            id,
            disabled,
            title,
            path,
            others_paths,
            external,
            icon,
          } = { ...m }

          const selected = !external && (pathname === path || toArray(others_paths).includes(pathname))

          const item = (
            <>
              {icon}
              <span className="whitespace-nowrap">
                {title}
              </span>
            </>
          )

          const className =
            `bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 rounded ${
              disabled ?
                'cursor-not-allowed' :
                'cursor-pointer'
            } flex items-center uppercase ${
              selected ?
                'text-blue-600 dark:text-white text-sm font-extrabold' :
                'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-semibold hover:font-bold'
            } space-x-1.5 py-2 px-2.5`

          return (
            external ?
              <a
                key={id}
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {item}
              </a> :
              <Link
                key={id}
                href={path}
              >
                <div className={className}>
                  {item}
                </div>
              </Link>
          )
        })
      }
    </div>
  )
}