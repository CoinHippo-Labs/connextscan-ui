import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import Web3 from 'web3'
import { Tooltip } from '@material-tailwind/react'

import Image from '../image'
import { getChainData, getAssetData, getContractData } from '../../lib/object'
import { split, toArray, equalsIgnoreCase } from '../../lib/utils'
import { WEB3_CHAIN_ID } from '../../reducers/types'

export default (
  {
    chain,
    asset,
    address,
    width = 20,
    height = 20,
    noTooltip = false,
  },
) => {
  const dispatch = useDispatch()
  const { chains, assets, _web3 } = useSelector(state => ({ chains: state.chains, assets: state.assets, _web3: state.web3 }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { web3_chain_id } = { ..._web3 }

  const [web3, setWeb3] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [data, setData] = useState(null)

  useEffect(
    () => {
      if (!web3) {
        setWeb3(new Web3(Web3.givenProvider))
      }
      else {
        try {
          web3.currentProvider._handleChainChanged = e => {
            try {
              const chainId = Web3.utils.hexToNumber(e.chainId)
              setChainId(chainId)
              dispatch({ type: WEB3_CHAIN_ID, value: chainId })
            } catch (error) {}
          }
        } catch (error) {}
      }
    },
    [web3],
  )

  useEffect(
    () => {
      if (web3_chain_id) {
        setChainId(web3_chain_id)
      }
    },
    [web3_chain_id],
  )

  useEffect(
    () => {
      if (data && data.chain_id === chainId && data.token_data) {
        addToken(data.chain_id, data.token_data)
      }
    },
    [chainId, data],
  )

  const addToken = async (chain_id, token_data) => {
    if (web3 && token_data) {
      if (chain_id === chainId) {
        try {
          const { address, decimals, symbol, image } = { ...token_data }
          await web3.currentProvider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address,
                symbol,
                decimals,
                image: image ? `${image.startsWith('/') ? window.location.origin : ''}${image}` : undefined,
              },
            },
          })
        } catch (error) {}
        setData(null)
      }
      else {
        switchNetwork(chain_id, token_data)
      }
    }
  }

  const switchNetwork = async (chain_id, token_data) => {
    try {
      await web3.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: web3.utils.toHex(chain_id) }],
      })
    } catch (error) {
      const { code } = { ...error }
      if (code === 4902) {
        try {
          const { provider_params } = { ...toArray(chains_data).find(c => c.chain_id === chain_id) }
          await web3.currentProvider.request({
            method: 'wallet_addEthereumChain',
            params: provider_params,
          })
        } catch (error) {}
      }
    }

    if (token_data) {
      setData({ chain_id, token_data })
    }
  }

  const { chain_id, name } = { ...getChainData(chain, chains_data) }
  const asset_data = getAssetData(asset, assets_data)
  const { contracts } = { ...asset_data }
  const contract_data = getContractData(chain_id, contracts)
  const { next_asset } = { ...contract_data }
  const { contract_address, symbol, decimals, image } = { ...contract_data, ...(equalsIgnoreCase(address, next_asset?.contract_address) && next_asset) }

  const token_data = {
    address: contract_address,
    symbol: symbol || asset_data?.symbol,
    decimals: decimals || asset_data?.decimals,
    image: image || asset_data?.image,
  }
  const already_on = chain_id === web3_chain_id

  const button = (
    <button
      onClick={
        () => {
          if (chain) {
            if (asset) {
              addToken(chain_id, token_data)
            }
            else {
              switchNetwork(chain_id)
            }
          }
        }
      }
      className={`${already_on || !chain ? 'cursor-not-allowed' : 'cursor-pointer'}`}
    >
      <Image
        src="/logos/wallets/metamask.png"
        width={width}
        height={height}
      />
    </button>
  )

  const tooltip = already_on ? 'No action needed. Your MetaMask wallet is currently on this chain.' : split(`Add ${asset ? token_data.symbol || asset : ''} ${chain && asset ? 'on' : ''} ${name || chain} to MetaMask`, 'normal', ' ').join(' ')

  return chainId && (!noTooltip ?
    <Tooltip content={tooltip}>
      {button}
    </Tooltip> :
    button
  )
}