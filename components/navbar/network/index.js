import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import { Puff } from 'react-loader-spinner'

import Networks from './networks'
import Image from '../../image'
import { connext } from '../../../lib/object/chain'

export default function DropdownNetwork() {
  const { chains, preferences } = useSelector(state => ({ chains: state.chains, preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }

  const router = useRouter()
  const { query } = { ...router }
  const { blockchain_id } = { ...query }

  const chain = chains_data?.find(c => c?.id === blockchain_id)

  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    const handleClickOutside = event => {
      if (
        hidden ||
        buttonRef.current.contains(event.target) ||
        dropdownRef.current.contains(event.target)
      ) {
        return false
      }
      setHidden(!hidden)
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [hidden, buttonRef, dropdownRef])

  const handleDropdownClick = () => setHidden(!hidden)

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={handleDropdownClick}
        className="w-10 sm:w-12 h-16 flex items-center justify-center"
      >
        {chain ?
          chain.image ?
            <Image
              src={chain.image}
              alt=""
              className="w-6 h-6 rounded-full"
            />
            :
            <span className="font-bold">{chain.short_name}</span>
          :
          chains_data ?
            <Image
              src={connext.image}
              alt=""
              className="w-6 h-6 rounded-full"
            />
            :
            <Puff color={theme === 'dark' ? 'white' : '#3B82F6'} width="24" height="24" />
        }
      </button>
      <div
        ref={dropdownRef} 
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 right-3 mt-12`}
      >
        <div className="dropdown-content w-64 bottom-start">
          <Networks handleDropdownClick={handleDropdownClick} />
        </div>
      </div>
    </div>
  )
}