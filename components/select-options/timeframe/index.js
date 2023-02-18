import { useState, useEffect, useRef } from 'react'

import Items from './items'
import { timeframes } from '../../../lib/object/timeframe'

export default (
  {
    value = null,
    onSelect,
  },
) => {
  const [hidden, setHidden] = useState(true)

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

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }
    setHidden(!hidden)
  }

  const {
    title,
  } = { ...timeframes.find(t => t?.day === value) }

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        onClick={() => onClick(value)}
        className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl shadow flex items-center justify-center space-x-1.5 py-2 px-3"
      >
        <span className="whitespace-nowrap text-sm font-semibold">
          {title}
        </span>
      </button>
      <div
        ref={dropdownRef}
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 right-0 mt-10`}
      >
        <div className="dropdown-content w-28 bottom-start">
          <Items
            value={value}
            onClick={id => onClick(id)}
          />
        </div>
      </div>
    </div>
  )
}