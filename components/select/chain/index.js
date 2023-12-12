import { useState } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { BiX, BiChevronDown } from 'react-icons/bi'

import Search from './search'
import Image from '../../image'
import Modal from '../../modal'
import { chainName, getChainData } from '../../../lib/object'

export default (
  {
    disabled = false,
    value,
    onSelect,
    source,
    destination,
    origin = '',
    isPool = false,
    noShadow = true,
    fixed = false,
    canClose = true,
    className = '',
  },
) => {
  const { preferences, chains } = useSelector(state => ({ preferences: state.preferences, chains: state.chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }

  const [hidden, setHidden] = useState(true)

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }
    if (id) {
      setHidden(!hidden)
    }
  }

  const chain_data = getChainData(value, chains_data)
  const { image, color } = { ...chain_data }
  const boxShadow = color && !noShadow && `${color}${theme === 'light' ? '44' : '33'} 0px 4px 16px 8px`

  return (
    <Modal
      id="modal-chains"
      hidden={hidden}
      disabled={disabled || fixed}
      onClick={open => setHidden(!open)}
      buttonTitle={
        chains_data ?
          <div className={fixed ? 'min-w-max bg-slate-100 dark:bg-slate-900 cursor-default rounded border dark:border-slate-800 flex items-center justify-between space-x-0.5 sm:space-x-2 py-1.5 sm:py-2 px-2 sm:px-1.5' : className || 'min-w-max bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded shadow flex items-center justify-between space-x-1.5 p-2'}>
            <div className="flex items-center space-x-2 3xl:space-x-3">
              {image && (
                <Image
                  src={image}
                  width={20}
                  height={20}
                  className="3xl:w-6 3xl:h-6 rounded-full"
                />
              )}
              <span className="whitespace-nowrap text-sm sm:text-base font-semibold">
                {chainName(chain_data) || (origin ? 'Chain' : 'All Chain')}
              </span>
            </div>
            {/*!fixed && <BiChevronDown size={18} className="3xl:w-6 3xl:h-6 text-slate-400 dark:text-slate-200" />*/}
            {canClose && value && (
              <div onClick={() => onClick(null)} className="cursor-pointer">
                <BiX size={14} />
              </div>
            )}
          </div> :
          null
      }
      buttonClassName={className || `min-w-max h-8 sm:h-10 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      buttonStyle={{ boxShadow, WebkitBoxShadow: boxShadow, MozBoxShadow: boxShadow }}
      ignoreSVG={canClose}
      title={
        <span className="flex items-center space-x-1 pt-1 pb-2">
          <span className="capitalize">
            {origin || 'select'}
          </span>
          <span className="normal-case">
            chain
          </span>
        </span>
      }
      body={
        <Search
          value={value}
          onSelect={id => onClick(id)}
          source={source}
          destination={destination}
          isPool={isPool}
        />
      }
      noButtons={true}
    />
  )
}