import Link from 'next/link'
import { useRouter } from 'next/router'
import { TiArrowRight } from 'react-icons/ti'

import menus from '../menus'

export default function Items({ onClick }) {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="flex flex-wrap">
      {menus.filter(m => m?.path).map((m, i) => {
        const item = (
          <>
            {m.icon}
            <span className="text-xs">{m.title}</span>
          </>
        )
        const className = `dropdown-item w-full bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 ${m.disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase ${!m.external && pathname === m.path ? 'font-bold' : 'font-medium'} space-x-1.5 p-3`
        return m.external ?
          <a
            key={i}
            href={m.path}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onClick}
            className={className}
          >
            {item}
            <TiArrowRight size={18} className="transform -rotate-45" />
          </a>
          :
          <Link key={i} href={m.path}>
            <a
              onClick={onClick}
              className={className}
            >
              {item}
            </a>
          </Link>
      })}
    </div>
  )
}