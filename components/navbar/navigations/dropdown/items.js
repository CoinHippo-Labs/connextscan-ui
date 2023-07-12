import Link from 'next/link'
import { useRouter } from 'next/router'

import routes from '../routes'
import { toArray } from '../../../../lib/utils'

export default ({ onClick }) => {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="flex flex-col">
      {routes.map((d, i) => {
        const { id, disabled, title, path, others_paths, group, icon } = { ...d }
        const external = !path?.startsWith('/')
        const selected = !external && (pathname === path || toArray(others_paths).includes(pathname))
        const item = (
          <>
            {icon}
            <span className="whitespace-nowrap">
              {title}
            </span>
          </>
        )
        const className = `w-full ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} flex items-center uppercase ${selected ? 'text-blue-600 dark:text-white text-sm font-extrabold' : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-medium'} space-x-1.5 py-2 px-3`
        return (
          external ?
            <a
              key={i}
              href={path}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClick}
              className={className}
            >
              {item}
            </a> :
            <Link key={i} href={path}>
              <div
                onClick={onClick}
                className={className}
              >
                {item}
              </div>
            </Link>
        )
      })}
    </div>
  )
}