import { useRouter } from 'next/router'
import { useState } from 'react'
import { FiSearch } from 'react-icons/fi'

import Search from './search'
import Modal from '../../modal'

export default () => {
  const router = useRouter()

  const [hidden, setHidden] = useState(true)

  const onClick = path => {
    if (path) {
      setHidden(!hidden)
      router.push(path)
    }
  }

  return (
    <Modal
      hidden={hidden}
      onClick={open => setHidden(!open)}
      buttonTitle={
        <div className="navbar-search mr-1 sm:mx-2">
          <div className="relative flex items-center">
            <input
              disabled={true}
              onClick={() => inputSearchRef?.current?.focus()}
              type="search"
              placeholder="Search"
              className="w-56 h-10 appearance-none focus:ring-0 rounded text-sm pl-3 pr-10"
            />
            <FiSearch size={16} className="absolute right-0 mr-2" />
          </div>
        </div>
      }
      buttonClassName="min-w-max flex items-center justify-center"
      title="Search"
      body={<Search onSelect={path => onClick(path)} />}
      noButtons={true}
    />
  )
}