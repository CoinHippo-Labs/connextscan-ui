import Link from 'next/link'
import { useRouter } from 'next/router'

import menus from '../menus'
import { toArray } from '../../../../lib/utils'

export default (
  {
    onClick,
  },
) => {
  const router = useRouter()
  const {
    pathname,
  } = { ...router }

  return (
    <div className="flex flex-wrap">
      {menus
        .filter(m =>
          m?.path
        )
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
            `dropdown-item w-full bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 ${
              disabled ?
                'cursor-not-allowed' :
                'cursor-pointer'
            } flex items-center uppercase ${
              selected ?
                'text-blue-600 dark:text-white text-sm font-extrabold' :
                'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-semibold hover:font-bold'
            } space-x-1.5 p-3`

          return (
            external ?
              <a
                key={id}
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                onClick={onClick}
                className={className}
              >
                {item}
              </a> :
              <Link
                key={id}
                href={path}
              >
                <div
                  onClick={onClick}
                  className={className}
                >
                  {item}
                </div>
              </Link>
          )
        })
      }
    </div>
  )
}