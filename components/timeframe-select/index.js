import { useState, useEffect, useRef } from 'react'

import Timeframes from './timeframes'

export default function DropdownTimeframe({ timeframe, onClick }) {
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
        className="flex items-center justify-center"
      >
        <div className="min-w-max bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-xl font-semibold py-1.5 px-3">
          {timeframe.title}
        </div>
      </button>
      <div
        ref={dropdownRef}
        className={`dropdown ${hidden ? '' : 'open'} absolute top-0 right-0 mt-8`}
      >
        <div className="dropdown-content w-20 bottom-start">
          <Timeframes
            handleDropdownClick={t => {
              if (onClick) {
                onClick(t)
              }
              handleDropdownClick()
            }}
          />
        </div>
      </div>
    </div>
  )
}