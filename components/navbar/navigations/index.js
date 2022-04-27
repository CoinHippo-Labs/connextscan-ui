import Link from 'next/link'
import { useRouter } from 'next/router'
import { TiArrowRight } from 'react-icons/ti'

import menus from './menus'

export default function Navigations() {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="hidden xl:flex items-center space-x-0 xl:space-x-2 mx-auto">
      {menus.filter(m => m?.path).map((m, i) => {
        const item = (
          <>
            {m.icon}
            <span className="whitespace-nowrap">{m.title}</span>
          </>
        )
        const className = `bg-transparent hover:bg-gray-100 dark:hover:bg-gray-900 rounded-lg ${m.disabled ? 'cursor-not-allowed' : ''} flex items-center uppercase text-xs ${!m.external && pathname === m.path ? 'font-bold' : 'font-medium'} space-x-1.5 py-2.5 px-3`
        return m.external ?
          <a
            key={i}
            href={m.path}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {item}
            <TiArrowRight size={20} className="transform -rotate-45" />
          </a>
          :
          <Link key={i} href={m.path}>
            <a className={className}>
              {item}
            </a>
          </Link>
      })}
    </div>
  )
}