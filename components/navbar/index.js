import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { NxtpSdk } from '@connext/nxtp-sdk'
import { Bignumber, Wallet, providers, utils } from 'ethers'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import Search from './search'
import Chains from './chains'
import Theme from './theme'
import SubNavbar from './sub-navbar'
import { chains as getChains, assets as getAssets } from '../../lib/api/config'
import { tokens as getTokens } from '../../lib/api/tokens'
import { ens as getEns } from '../../lib/api/ens'
import { coin } from '../../lib/api/coingecko'
import { assetBalances } from '../../lib/api/subgraph'
import { connext } from '../../lib/object/chain'
import { CHAINS_DATA, ASSETS_DATA, ENS_DATA, CHAIN_DATA, CHAINS_STATUS_DATA, ROUTERS_STATUS_DATA, ROUTERS_STATUS_TRIGGER, ASSET_BALANCES_DATA, ROUTERS_ASSETS_DATA, SDK, RPCS } from '../../reducers/types'

export default function Navbar() {
  const dispatch = useDispatch()
  const { chains, assets, ens, routers_status, asset_balances, dev, rpc_providers } = useSelector(state => ({ chains: state.chains, assets: state.assets, ens: state.ens, routers_status: state.routers_status, asset_balances: state.asset_balances, dev: state.dev, rpc_providers: state.rpc_providers }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }
  const { routers_status_trigger } = { ...routers_status }
  const { asset_balances_data } = { ...asset_balances }
  const { sdk } = { ...dev }
  const { rpcs } = { ...rpc_providers }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { chain } = { ...query }

  // chains
  useEffect(() => {
    const getData = async () => {
      const response = await getChains()
      if (response) {
        dispatch({
          type: CHAINS_DATA,
          value: response.evm,
        })
      }
    }
    getData()
  }, [])

  // assets
  useEffect(() => {
    const getData = async () => {
      const response = await assets()
      if (response) {
        dispatch({
          type: ASSETS_DATA,
          value: response,
        })
      }
    }
    getData()
  }, [])

  // price
  useEffect(() => {
    const getData = async is_interval => {
      if (chains_data && assets_data) {
        let updated_ids = is_interval ? [] : assets_data.filter(a => a?.price).map(a => a.id)
        if (updated_ids.length < assets_data.length) {
          let updated = false
          for (let i = 0; i < chains_data.length; i++) {
            const { chain_id } = { ...chains_data[i] }
            if (chain_id) {
              const addresses = assets_data.filter(a => !updated_ids.includes(a?.id) && a?.contracts?.findIndex(c => c?.chain_id === chain_id && c.contract_address) > -1).map(a => a.contracts.find(c => c?.chain_id === chain_id).contract_address)
              if (addresses.length > 0) {
                const response = await getTokens({ chain_id, addresses })
                response?.forEach(t => {
                  const asset_index = assets_data.findIndex(a => a?.id && a.contracts?.findIndex(c => c?.chain_id === t?.chain_id && c.contract_address?.toLowerCase() === t?.contract_address?.toLowerCase()) > -1)
                  if (asset_index > -1) {
                    const asset = assets_data[asset_index]
                    asset.price = t?.price || asset.price
                    assets_data[asset_index] = asset
                    updated_ids = _.uniq(_.concat(updated_ids, asset.id))
                    updated = true
                  }
                })
              }
            }
          }
          if (updated) {
            dispatch({
              type: ASSETS_DATA,
              value: assets_data,
            })
          }
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(true), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [chains_data, assets_data])

  // chain
  useEffect(() => {
    const getData = async () => {
      if (chains_data) {
        const chain_data = chains_data.find(c => c?.id === chain?.toLowerCase()) || connext
        dispatch({
          type: CHAIN_DATA,
          value: chain_data,
        })
        if (chain_data.coingecko_id) {
          const response = await coin(chain_data.coingecko_id)
          chain_data.token_data = !response?.error && response
          dispatch({
            type: CHAIN_DATA,
            value: chain_data,
          })
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [chains_data, chain])

  // sdk & rpcs
  useEffect(() => {
    const init = async () => {
      if (chains_data) {
        const chains_config = ['testnet'].includes(process.env.NEXT_PUBLIC_ENVIRONMENT) ?
          { 1: { providers: ['https://rpc.ankr.com/eth'] } } : {}
        const rpcs_config = {}
        for (let i = 0; i < chains_data.length; i++) {
          const chain_data = chains_data[i]
          const chain_id = chain_data?.chain_id
          chains_config[chain_id] = {
            providers: chain_data?.provider_params?.[0]?.rpcUrls?.filter(url => url) || [],
          }
          rpcs_config[chain_id] = new providers.FallbackProvider(chains_config[chain_id].map(url => new providers.JsonRpcProvider(url)))
        }

        dispatch({
          type: SDK,
          value: await NxtpSdk.create({
            chains: chains_config,
            signerAddress, Wallet.createRandom().address,
            logLevel: 'info',
            network: process.env.NEXT_PUBLIC_ENVIRONMENT,
          }),
        })
        if (!rpcs) {
          dispatch({
            type: RPCS,
            value: rpcs_config,
          })
        }
      }
    }
    init()
  }, [chains_data])

  // chains status
  useEffect(() => {
    const getChainStatus = async chain_data => {
      if (chain_data) {
        const response = await sdk.getSubgraphSyncStatus(chain_data.chain_id)
        dispatch({
          type: CHAINS_STATUS_DATA,
          value: response?.latestBlock > -1 && {
            ...chain: chain_data,
            ...response,
          },
        })
      }
    }
    const getData = async () => {
      if (sdk && chains_data) {
        chains_data.filter(c => !c?.disabled).forEach(c => getChainStatus(c))
      }
    }
    setTimeout(() => getData(), 15 * 1000)
    const interval = setInterval(() => getData(), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk])

  // routers status
  useEffect(() => {
    const getData = async () => {
      if (sdk_data) {
        if (routers_status_trigger) {
          dispatch({
            type: ROUTERS_STATUS_DATA,
            value: null,
          })
        }
        const response = await sdk.getRouterStatus(process.env.NEXT_PUBLIC_APP_NAME)
        if (response) {
          dispatch({
            type: ROUTERS_STATUS_DATA,
            value: response.filter(r => r?.supportedChains?.findIndex(id => chains_data?.findIndex(c => c?.chain_id === id) > -1) > -1),
          })
        }
        dispatch({
          type: ROUTERS_STATUS_TRIGGER,
          value: null,
        })
      }
    }
    getData()
    const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk, routers_status_trigger])

  // assets balances
  useEffect(() => {
    const getAssetBalances = async chain_data => {
      if (chain_data && !chain_data.disabled) {
        const { chain_id } = chain_data
        const response = await assetBalances(sdk, chain_id)
        const data = response?.data?.map(a => { return { ...a, chain_data } })
        dispatch({
          type: ASSET_BALANCES_DATA,
          value: { [`${chain_id}`]: data },
        })
      }
    }
    const getData = async is_interval => {
      if (sdk && chains_data &&
        assets_data && assets_data.findIndex(a => !a.price) < 0 &&
        !['/tx/[tx]'].includes(pathname) &&
        (!asset_balances_data || is_interval)
      ) {
        chains_data.forEach(c => getAssetBalances(c))
      }
    }
    getData()
    const interval = setInterval(() => getData(true), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk, chains_data, assets_data, pathname])

  // ens
  useEffect(() => {
    const getData = async () => {
      if (chains_data && asset_balances_data && chains_data.filter(c => !c?.disabled).length <= Object.keys(asset_balances_data).length) {
        const addresses = _.uniq(Object.values(asset_balances_data).flatMap(a => a || []).map(a => a?.router?.id).filter(a => a && !ens_data?.[a]))
        const ens_data = await getEns(addresses)
        if (ens_data) {
          dispatch({
            type: ENS_DATA,
            value: ens_data,
          })
        }
      }
    }
    getData()
  }, [chains_data, asset_balances_data])

  // routers assets
  useEffect(() => {
    if (assets_data && asset_balances_data) {
      const routers_assets = Object.entries(_.groupBy(Object.values(asset_balances_data).flatMap(a => a || []), 'router.id')).map(([k, v]) => {
        return {
          router_id: k,
          asset_balances: v?.map(a => {
            let asset_data = assets_data.find(_a => _a?.contracts?.findIndex(c => c?.chain_id === a?.chain_data?.chain_id && c?.contract_address?.toLowerCase() === a?.contract_address?.toLowerCase()) > -1)
            asset_data = asset_data && { ...asset_data, ...asset_data.contracts.find(c => c?.chain_id === asset_data.chain_data?.chain_id) }
            if (asset_data) {
              delete asset_data.contracts
            }
            return {
              ...a,
              asset_data,
            }
          }).map(a => {
            return {
              ...a,
              amount: utils.formatUnits(BigNumber.from(a?.amount || '0'), a?.asset_data?.contract_decimals || 0).toNumber(),
            }
          }).map(a => {
            const price = a?.asset_data?.price
            return {
              ...a,
              amount_value: a.amount * (price || 0),
            }
          }),
        }
      })
      dispatch({
        type: ROUTERS_ASSETS_DATA,
        value: routers,
      })
    }
  }, [assets_data, asset_balances_data])

  return (
    <>
      <div className="navbar">
        <div className="navbar-inner w-full sm:h-20 flex items-center">
          <Logo />
          <DropdownNavigations />
          <Navigations />
          <div className="flex items-center ml-auto">
            <Search />
            <Chains />
            <Theme />
          </div>
        </div>
      </div>
      <SubNavbar />
    </>
  )
}