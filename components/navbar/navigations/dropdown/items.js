import Link from 'next/link'
import { useRouter } from 'next/router'
import HeadShake from 'react-reveal/HeadShake'
import { FaHandPointLeft } from 'react-icons/fa'

import menus from '../menus'

export default ({
  onClick,
}) => {
  const router = useRouter()
  const {
    pathname,
  } = { ...router }

  return (
    <div className="flex flex-wrap">
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

          const selected = !external &&
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

          const right_icon = emphasize ?
            <HeadShake
              duration={1500}
              forever
            >
              <FaHandPointLeft
                size={20}
              />
            </HeadShake> :
            undefined

          const className = `dropdown-item w-full bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 ${disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase ${selected ? 'text-blue-600 dark:text-white text-sm font-extrabold' : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 text-sm font-semibold hover:font-bold'} space-x-1.5 p-3`

          return external ?
            <a
              key={id}
              href={path}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onClick}
              className={className}
            >
              {item}
              {right_icon}
            </a> :
            <Link
              key={id}
              href={path}
            >
              <a
                onClick={onClick}
                className={className}
              >
                {item}
                {right_icon}
              </a>
            </Link>
        })
      }
    </div>
  )
}