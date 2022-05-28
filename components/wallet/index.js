import { useState, useEffect, useCallback } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import Web3Modal from 'web3modal'
import { providers, utils } from 'ethers'

import { WALLET_DATA, WALLET_RESET } from '../../reducers/types'

const providerOptions = {}

const getNetwork = chain_id => {
  return {
    1: 'mainnet',
    56: 'binance',
    137: 'matic',
    42161: 'arbitrum',
    10: 'optimism',
    43114: 'avalanche-fuji-mainnet',
    250: 'fantom',
    100: 'xdai',
    1284: 'moonbeam',
    1285: 'moonriver',
    // 122: 'fuse',
    // 2001: 'milkomeda',
    // 288: 'boba',
    1666600000: 'harmony-shard1',
    // 192837465: 'gather',
    25: 'cronos',
    // 9001: 'evmos',
    3: 'ropsten',
    4: 'rinkeby',
    5: 'goerli',
    42: 'kovan',
    97: 'binance-testnet',
    80001: 'mumbai',
    421611: 'arbitrum-rinkeby',
    69: 'optimism-kovan',
    43113: 'avalanche-fuji-testnet',
    // 4002: 'fantom-tesnet',
    // 1287: 'moonbase',
    // 2221: 'kava-alpha',
  }[chain_id]
}

let web3Modal

export default ({
  mainController = false,
  hidden = false,
  disabled = false, 
  connectChainId,
  onSwitch,
  children,
  className = '',
}) => {
  const dispatch = useDispatch()
  const { preferences, chains, wallet } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, wallet: state.wallet }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { wallet_data } = { ...wallet }
  const { chain_id, provider, web3_provider } = { ...wallet_data }

  const [defaultChainId, setDefaultChainId] = useState(null)

  useEffect(() => {
    if (connectChainId && connectChainId !== defaultChainId) {
      setDefaultChainId(connectChainId)
    }
  }, [connectChainId])

  useEffect(() => {
    if (typeof window !== 'undefined') {
      if (web3_provider) {
        dispatch({
          type: WALLET_DATA,
          value: { default_chain_id: defaultChainId },
        })
      }
      web3Modal = new Web3Modal({
        network: getNetwork(defaultChainId) || 'mainnet',
        cacheProvider: true,
        providerOptions,
      })
    }
  }, [defaultChainId])

  useEffect(() => {
    if (web3Modal?.cachedProvider) {
      connect()
    }
  }, [web3Modal])

  useEffect(() => {
    const update = async () => {
      if (web3Modal) {
        await web3Modal.updateTheme(theme)
      }
    }
    update()
  }, [theme])

  const connect = useCallback(async () => {
    const provider = await web3Modal.connect()
    const web3Provider = new providers.Web3Provider(provider)
    const network = await web3Provider.getNetwork()
    const signer = web3Provider.getSigner()
    const address = await signer.getAddress()
    dispatch({
      type: WALLET_DATA,
      value: {
        chain_id: network.chainId,
        provider,
        web3_provider: web3Provider,
        address,
        signer,
      },
    })
  }, [web3Modal])

  const disconnect = useCallback(async (e, is_reestablish) => {
    if (web3Modal && !is_reestablish) {
      await web3Modal.clearCachedProvider()
    }
    if (provider?.disconnect && typeof provider.disconnect === 'function') {
      await provider.disconnect()
    }
    dispatch({
      type: WALLET_RESET,
    })
  }, [web3Modal, provider])

  const switchChain = async () => {
    if (connectChainId && connectChainId !== chain_id && provider) {
      try {
        await provider.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: utils.hexValue(connectChainId) }],
        })
      } catch (error) {
        if (error.code === 4902) {
          try {
            await provider.request({
              method: 'wallet_addEthereumChain',
              params: chains_data?.find(c => c.chain_id === connectChainId)?.provider_params,
            })
          } catch (error) {}
        }
      }
    }
  }

  useEffect(() => {
    if (provider?.on) {
      const handleChainChanged = chainId => {
        if (!chainId) {
          disconnect()
        }
        else {
          connect()
        }
      }
      const handleAccountsChanged = accounts => {
        if (!accounts[0]) {
          disconnect()
        }
        else {
          dispatch({
            type: WALLET_DATA,
            value: {
              address: accounts[0],
            },
          })
        }
      }
      const handleDisconnect = e => {
        disconnect(e, e.code === 1013)
        if (e.code === 1013) {
          connect()
        }
      }
      provider.on('chainChanged', handleChainChanged)
      provider.on('accountsChanged', handleAccountsChanged)
      provider.on('disconnect', handleDisconnect)
      return () => {
        if (provider.removeListener) {
          provider.removeListener('chainChanged', handleChainChanged)
          provider.removeListener('accountsChanged', handleAccountsChanged)
          provider.removeListener('disconnect', handleDisconnect)
        }
      }
    }
  }, [provider, disconnect])

  return !hidden && (
    <>
      {web3_provider ?
        !mainController && connectChainId && connectChainId !== chain_id ?
          <button
            disabled={disabled}
            onClick={() => {
              switchChain()
              if (onSwitch) {
                onSwitch()
              }
            }}
            className={className}
          >
            {children || (
              <div className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 rounded-lg whitespace-nowrap font-medium py-1 px-2">
                Switch Network
              </div>
            )}
          </button>
          :
          <button
            disabled={disabled}
            onClick={disconnect}
            className={className}
          >
            {children || (
              <div className="bg-red-500 hover:bg-red-600 dark:bg-red-600 dark:hover:bg-red-700 rounded-lg whitespace-nowrap text-white font-medium py-1 px-2">
                Disconnect
              </div>
            )}
          </button>
        :
        <button
          disabled={disabled}
          onClick={connect}
          className={className}
        >
          {children || (
            <div className="bg-blue-500 hover:bg-blue-600 dark:bg-blue-600 dark:hover:bg-blue-700 rounded-lg whitespace-nowrap text-white font-medium py-1 px-2">
              Connect
            </div>
          )}
        </button>
      }
    </>
  )
}