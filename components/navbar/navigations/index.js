import Link from 'next/link'
import { useRouter } from 'next/router'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'

import menus from './menus'

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
            emphasize,
            title,
            path,
            others_paths,
            external,
            icon,
          } = { ...m }

          const selected =
            !external &&
            (
              pathname === path ||
              others_paths?.includes(pathname)
            )

          const item = (
            <>
              {icon}
              <span className="whitespace-nowrap tracking-wider">
                {title}
              </span>
            </>
          )

          const right_icon =
            emphasize ?
              <HeadShake
                duration={1500}
                forever
              >
                <FaHandPointLeft
                  size={18}
                />
              </HeadShake> :
              undefined

          const className = `bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 rounded-lg ${disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase ${selected ? 'text-blue-600 dark:text-white text-sm font-extrabold' : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-semibold hover:font-bold'} space-x-1.5 py-2 px-2.5`

          return external ?
            <a
              key={id}
              href={path}
              target="_blank"
              rel="noopener noreferrer"
              className={className}
            >
              {item}
              {right_icon}
            </a> :
            <Link
              key={id}
              href={path}
            >
              <a className={className}>
                {item}
                {right_icon}
              </a>
            </Link>
        })
      }
    </div>
  )
}