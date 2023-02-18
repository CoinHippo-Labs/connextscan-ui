import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { TailSpin } from 'react-loader-spinner'

import Search from './search'
import Image from '../../image'
import Modal from '../../modals'
import { getChain, chainName } from '../../../lib/object/chain'
import { loaderColor } from '../../../lib/utils'

export default (
  {
    disabled = false,
    value,
    onSelect,
  },
) => {
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

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }
    setHidden(!hidden)
  }

  const chain_data = getChain(value, chains_data)

  const {
    image,
  } = { ...chain_data }

  return (
    <Modal
      id="modal-chains"
      noButtons={true}
      hidden={hidden}
      disabled={disabled}
      onClick={open => setHidden(!open)}
      buttonTitle={
        chains_data ?
          <div className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl shadow flex items-center justify-center space-x-1.5 py-2 px-3">
            {
              image &&
              (
                <Image
                  src={image}
                  width={24}
                  height={24}
                  className="rounded-full"
                />
              )
            }
            <span className="whitespace-nowrap text-sm sm:text-base font-semibold">
              {chainName(chain_data) || 'All Chains'}
            </span>
          </div> :
          <TailSpin
            width="24"
            height="24"
            color={loaderColor(theme)}
          />
      }
      buttonClassName={`min-w-max sm:h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      title="Select Chain"
      body={
        <Search
          value={value}
          onSelect={id => onClick(id)}
        />
      }
    />
  )
}