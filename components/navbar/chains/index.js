import { useRouter } from 'next/router'
import { useState, useEffect, useRef } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import Items from './items'
import Spinner from '../../spinner'
import Image from '../../image'
import { CONNEXT, getChainData } from '../../../lib/object'

export default () => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const [hidden, setHidden] = useState(true)

  const buttonRef = useRef(null)
  const dropdownRef = useRef(null)

  const router = useRouter()
  const { query } = { ...router }
  const { chain } = { ...query }

  useEffect(
    () => {
      const handleClickOutside = e => {
        if (hidden || buttonRef.current.contains(e.target) || dropdownRef.current.contains(e.target)) {
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

  const chain_data = getChainData(chain, chains_data)
  const { short_name, image } = { ...chain_data }

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
              className="3xl:w-8 3xl:h-8 rounded-full"
            /> :
            <span className="font-semibold">
              {short_name}
            </span> :
          chains_data ?
            <Image
              src={CONNEXT.image}
              width={24}
              height={24}
              className="3xl:w-8 3xl:h-8"
            /> :
            <Spinner name="Puff" />
        }
      </button>
      <div
        ref={dropdownRef}
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 left-3 mt-12`}
      >
        <div className="dropdown-content w-52 bottom-start">
          <Items onClick={onClick} />
        </div>
      </div>
    </div>
  )
}