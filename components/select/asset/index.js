import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { RotatingTriangles } from 'react-loader-spinner'

import Image from '../../image'
import Search from './search'
import Modal from '../../modals'
import { loader_color } from '../../../lib/utils'

export default ({
  disabled = false,
  value,
  onSelect,
  chain,
}) => {
  const {
    preferences,
    chains,
    assets,
  } = useSelector(state =>
    (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
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
  const {
    assets_data,
  } = { ...assets }

  const [hidden, setHidden] = useState(true)

  const onClick = id => {
    if (onSelect) {
      onSelect(id)
    }

    setHidden(!hidden)
  }

  const chain_data = chains_data?.find(c =>
    Array.isArray(chain) ?
      chain.includes(c?.id) :
      c?.id === chain
  )
  const {
    chain_id,
  } = { ...chain_data }

  const asset_data = assets_data?.find(c =>
    c?.id === value
  )
  const {
    contracts,
  } = { ...asset_data }

  const contract_data = contracts?.find(c =>
    c?.chain_id === chain_id
  )
  let {
    symbol,
    image,
  } = { ...contract_data }

  symbol =
    symbol ||
    asset_data?.symbol ||
    'All Assets'
  image =
    image ||
    asset_data?.image

  return (
    <Modal
      id="modal-assets"
      noButtons={true}
      hidden={hidden}
      disabled={disabled}
      onClick={open => setHidden(!open)}
      buttonTitle={assets_data ?
        <div className="bg-slate-50 hover:bg-slate-100 dark:bg-slate-900 dark:hover:bg-slate-800 rounded-xl shadow flex items-center justify-center space-x-1.5 py-2 px-3">
          {image && (
            <Image
              src={image}
              alt=""
              width={24}
              height={24}
              className="rounded-full"
            />
          )}
          <span className="whitespace-nowrap text-sm sm:text-base font-semibold">
            {symbol}
          </span>
        </div> :
        <RotatingTriangles
          color={loader_color(theme)}
          width="24"
          height="24"
        />
      }
      buttonClassName={`min-w-max sm:h-16 ${disabled ? 'cursor-not-allowed' : ''} flex items-center justify-center`}
      title="Select Asset"
      body={(
        <Search
          value={value}
          onSelect={id => onClick(id)}
          chain={chain}
        />
      )}
    />
  )
}