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
import { CHAINS_DATA, ASSETS_DATA, ENS_DATA, CHAIN_DATA, ASSET_BALANCES_DATA, SDK, RPCS } from '../../reducers/types'

export default function Navbar() {
  const dispatch = useDispatch()
  const { chains, assets, ens, asset_balances, dev, rpc_providers, wallet } = useSelector(state => ({ chains: state.chains, assets: state.assets, ens: state.ens, asset_balances: state.asset_balances, dev: state.dev, rpc_providers: state.rpc_providers, wallet: state.wallet }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }
  const { asset_balances_data } = { ...asset_balances }
  const { sdk } = { ...dev }
  const { rpcs } = { ...rpc_providers }
  const { wallet_data } = { ...wallet }
  const { chain_id, address, signer } = { ...wallet_data }

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
      const response = await getAssets()
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
              value: _.cloneDeep(assets_data),
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
      if (chains_data && assets_data?.findIndex(a => a.price) < 0) {
        const chains_config = {}, rpcs_config = {}
        for (let i = 0; i < chains_data.length; i++) {
          const chain_data = chains_data[i]
          if (!chain_data?.disabled) {
            const chain_id = chain_data?.chain_id
            const domain_id = chain_data?.domain_id
            const rpc_urls = chain_data?.provider_params?.[0]?.rpcUrls?.filter(url => url) || []
            if (domain_id) {
              chains_config[domain_id] = {
                providers: rpc_urls,
                assets: assets_data.filter(a => a?.contracts?.findIndex(c => c?.chain_id === chain_id) > -1).map(a => {
                  const contract = a.contracts.find(c => c?.chain_id === chain_id)
                  const name = contract.symbol || a.symbol || a.name
                  const address = contract.contract_address
                  return { name, address }
                }),
              }
            }
            rpcs_config[chain_id] = new providers.FallbackProvider(rpc_urls.map(url => new providers.JsonRpcProvider(url)))
          }
        }

        if (!sdk) {
          dispatch({
            type: SDK,
            value: await NxtpSdk.create({
              chains: chains_config,
              signerAddress: address || Wallet.createRandom().address,
              logLevel: 'info',
              network: process.env.NEXT_PUBLIC_ENVIRONMENT,
            }, signer || undefined),
          })
        }
        if (!rpcs) {
          dispatch({
            type: RPCS,
            value: rpcs_config,
          })
        }
      }
    }
    init()
  }, [chains_data, assets_data])

  // change signer
  useEffect(() => {
    if (sdk) {
      sdk.changeInjectedSigner(signer)
      dispatch({
        type: SDK,
        value: sdk,
      })
    }
  }, [chain_id, address])

  // assets balances
  useEffect(() => {
    const getAssetBalances = async chain_data => {
      if (chain_data && !chain_data.disabled) {
        const { chain_id } = chain_data
        // const response = await assetBalances(sdk, chain_id)
        // const data = response?.data?.map(a => { return { ...a, chain_data } })
        // dispatch({
        //   type: ASSET_BALANCES_DATA,
        //   value: { [`${chain_id}`]: data },
        // })
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

  return (
    <>
      <div className="navbar">
        <div className="navbar-inner w-full sm:h-20 flex items-center justify-between">
          <Logo />
          <DropdownNavigations />
          <Navigations />
          <div className="flex items-center">
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