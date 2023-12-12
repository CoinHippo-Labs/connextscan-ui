import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Menu, MenuHandler, MenuList } from '@material-tailwind/react'

import routes from './routes'
import { toArray } from '../../../lib/utils'

const Group = ({ title, items, pathname, className = '' }) => {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <Menu
      open={isOpen}
      handler={setIsOpen}
      placement="bottom"
      allowHover={true}
      offset={{ mainAxis: 12 }}
    >
      <MenuHandler>
        <div className={className}>
          <span className="whitespace-nowrap tracking-wider">
            {title}
          </span>
        </div>
      </MenuHandler>
      <MenuList className="w-56 bg-light dark:bg-slate-900 p-4">
        <div className="flex flex-col space-y-4">
          {toArray(items).map((d, i) => {
            const { disabled, title, path, others_paths, icon } = { ...d }
            const external = !path?.startsWith('/')
            const selected = !external && (pathname === path || toArray(others_paths).includes(pathname))
            const item = (
              <>
                {icon}
                <span className="whitespace-nowrap tracking-wider">
                  {title}
                </span>
              </>
            )
            const className = `${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} flex items-center uppercase custom-font ${selected ? 'text-blue-600 dark:text-white text-sm font-extrabold' : 'text-slate-700 hover:text-blue-400 dark:text-slate-200 dark:hover:text-slate-100 text-sm font-medium'} space-x-1.5`
            return external ?
              <a
                key={i}
                href={path}
                target="_blank"
                rel="noopener noreferrer"
                className={className}
              >
                {item}
              </a> :
              <Link key={i} href={path}>
                <div className={className}>
                  {item}
                </div>
              </Link>
           )}
        </div>
      </MenuList>
    </Menu>
  )
}

export default () => {
  const router = useRouter()
  const { pathname } = { ...router }

  return (
    <div className="hidden xl:flex items-center xl:space-x-2 3xl:space-x-3 mx-auto">
      {routes.map((d, i) => {
        const { id, disabled, title, path, others_paths, group, icon } = { ...d }
        const is_group = group && i === routes.findIndex(d => d.group === group)
        const external = !path?.startsWith('/')
        const items = routes.filter(d => d.group === group)
        const selected = (!external && (pathname === path || toArray(others_paths).includes(pathname))) || (is_group && items.findIndex(d => pathname === d.path || toArray(d.others_paths).includes(pathname)) > -1)
        const item = (
          <>
            {icon}
            <span className="whitespace-nowrap tracking-wider">
              {title}
            </span>
          </>
        )
        const className = `bg-transparent hover:bg-blue-50 dark:hover:bg-slate-800 rounded ${disabled ? 'cursor-not-allowed' : 'cursor-pointer'} flex items-center uppercase ${selected ? 'text-blue-600 dark:text-white font-extrabold' : 'text-slate-600 hover:text-slate-700 dark:text-slate-300 dark:hover:text-slate-200 font-semibold hover:font-bold'} text-sm 3xl:text-xl space-x-1.5 3xl:space-x-3 py-2 px-2.5`
        const component = external ?
          <a
            key={i}
            href={path}
            target="_blank"
            rel="noopener noreferrer"
            className={className}
          >
            {item}
          </a> :
          <Link key={i} href={path}>
            <div className={className}>
              {item}
            </div>
          </Link>
        return (!group || is_group) && (is_group ?
          <Group
            key={i}
            title={getTitle(group)}
            items={items}
            pathname={pathname}
            className={className}
          /> :
          component
        )
      })}
    </div>
  )
}