import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { Puff } from 'react-loader-spinner'

import Image from '../../image'
import Items from './items'
import { getChain, connext } from '../../../lib/object/chain'
import { loaderColor } from '../../../lib/utils'

export default () => {
  const {
    preferences,
    chains,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
      }
    ),
    shallowEqual,
  )
  const {
    theme,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }

  const [hidden, setHidden] = useState(true)

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    chain,
  } = { ...query }

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(
    () => {
      const handleClickOutside = e => {
        if (
          hidden ||
          buttonRef.current.contains(e.target) ||
          dropdownRef.current.contains(e.target)
        ) {
          return false
        }

        setHidden(!hidden)
      }

      document.addEventListener('mousedown', handleClickOutside)
      return () => document.removeEventListener('mousedown', handleClickOutside)
    },
    [hidden, buttonRef, dropdownRef],
  )

  const onClick = () => setHidden(!hidden)

  const chain_data = getChain(chain, chains_data)

  const {
    short_name,
    image,
  } = { ...chain_data }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={onClick}
        className="w-10 sm:w-12 h-16 flex items-center justify-center"
      >
        {chain_data ?
          image ?
            <Image
              src={image}
              width={24}
              height={24}
              className="rounded-full"
            /> :
            <span className="font-semibold">
              {short_name}
            </span> :
          chains_data ?
            <Image
              src={connext.image}
              width={24}
              height={24}
            /> :
            <Puff
              width="24"
              height="24"
              color={loaderColor(theme)}
            />
        }
      </button>
      <div
        ref={dropdownRef}
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 right-3 mt-12`}
      >
        <div className="dropdown-content w-72 bottom-start">
          <Items
            onClick={onClick}
          />
        </div>
      </div>
    </div>
  )
}