import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { FallingLines } from 'react-loader-spinner'

import Image from '../../image'
import Search from './search'
import Modal from '../../modals'
import { chainName } from '../../../lib/object/chain'
import { loader_color } from '../../../lib/utils'

export default ({
  disabled = false,
  value,
  onSelect,
}) => {
  const { preferences, chains } = useSelector(state => ({ preferences: state.preferences, chains: state.chains }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }

  const [hidden, setHidden] = useState(true)

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }
    setHidden(!hidden)
  }

  const chain_data = chains_data?.find(c => c?.id === value)

  return (
    <Modal
      id="modal-chains"
      noButtons={true}
      hidden={hidden}
      disabled={disabled}
      onClick={open => setHidden(!open)}
      buttonTitle={chains_data ?
        <div className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl shadow flex items-center justify-center space-x-1.5 py-2 px-3">
          {chain_data && (
            <Image
              src={chain_data.image}
              alt=""
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span className="text-sm sm:text-base font-semibold">
            {chain_data ? chainName(chain_data) : 'All Chains'}
          </span>
        </div>
        :
        <FallingLines color={loader_color(theme)} width="24" height="24" />
      }
      buttonClassName={`min-w-max h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      title="Select Chain"
      body={(
        <Search
          value={value}
          onSelect={id => onClick(id)}
        />
      )}
    />
  )
}