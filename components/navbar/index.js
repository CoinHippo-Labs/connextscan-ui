import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'

import _ from 'lodash'
import { NxtpSdk } from '@connext/nxtp-sdk'
import { providers, Wallet } from 'ethers'
import BigNumber from 'bignumber.js'
import { FiMenu, FiMoon, FiSun } from 'react-icons/fi'

import Logo from './logo'
import DropdownNavigation from './navigation/dropdown'
import Navigation from './navigation'
import Search from './search'
import Network from './network'
import SubNavbar from './sub-navbar'
import PageTitle from './page-title'

import { chains as getChains, assets as getAssets } from '../../lib/api/crosschain_config'
import { tokens as getTokens } from '../../lib/api/tokens'
import { domains, getENS } from '../../lib/api/ens'
import { coin } from '../../lib/api/coingecko'
import { assetBalances } from '../../lib/api/subgraph'
import { connext, chainExtraData } from '../../lib/object/chain'

import { THEME, CHAINS_DATA, ASSETS_DATA, TOKENS_DATA, ENS_DATA, STATUS_DATA, CHAINS_STATUS_DATA, ROUTERS_STATUS_DATA, ROUTERS_STATUS_TRIGGER, ASSET_BALANCES_DATA, ROUTERS_ASSETS_DATA, SDK_DATA, RPCS_DATA } from '../../reducers/types'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function Navbar() {
  const dispatch = useDispatch()
  const { preferences, chains, assets, tokens, ens, routers_status, asset_balances, sdk, rpcs } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, tokens: state.tokens, ens: state.ens, routers_status: state.routers_status, asset_balances: state.asset_balances, sdk: state.sdk, rpcs: state.rpcs }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { tokens_data } = { ...tokens }
  const { ens_data } = { ...ens }
  const { routers_status_trigger } = { ...routers_status }
  const { asset_balances_data } = { ...asset_balances }
  const { sdk_data } = { ...sdk }
  const { rpcs_data } = { ...rpcs }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { blockchain_id } = { ...query }

  // chains
  useEffect(() => {
    const getData = async () => {
      const response = await getChains()

      if (response) {
        dispatch({
          type: CHAINS_DATA,
          value: response,
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

  // sdk & rpcs
  useEffect(() => {
    const init = async () => {
      if (chains_data) {
        const chainConfig = ['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK) ?
          { 1: { providers: ['https://rpc.ankr.com/eth', 'https://cloudflare-eth.com'] } }
          :
          {}

        const rpcs = {}

        for (let i = 0; i < chains_data.length; i++) {
          const chain = chains_data[i]

          chainConfig[chain?.chain_id] = {
            providers: chain?.provider_params?.[0]?.rpcUrls?.filter(rpc => rpc && !rpc.startsWith('wss://') && !rpc.startsWith('ws://')) || [],
          }

          // if ([42161].includes(chain?.chain_id)) {
          //   chainConfig[chain?.chain_id].gelatoOracle = false;
          // }

          rpcs[chain?.chain_id] = new providers.FallbackProvider(chain?.provider_params?.[0]?.rpcUrls?.filter(rpc => rpc && !rpc.startsWith('wss://') && !rpc.startsWith('ws://')).map(rpc => new providers.JsonRpcProvider(rpc)) || [])
        }

        dispatch({
          type: SDK_DATA,
          value: await NxtpSdk.create({ chainConfig, signer: Wallet.createRandom(), skipPolling: false }),
        })

        if (!rpcs_data) {
          dispatch({
            type: RPCS_DATA,
            value: rpcs,
          })
        }
      }
    }

    init()
  }, [chains_data])

  // status
  useEffect(() => {
    const getData = async () => {
      if (chains_data) {
        const chain = chains_data.find(c => c?.id === blockchain_id?.toLowerCase())// || connext

        if (chain) {
          const extra_data = chainExtraData(chain.chain_id)
          const data = { ...chain, ...extra_data, token_data: null }

          dispatch({
            type: STATUS_DATA,
            value: { ...data },
          })

          if (extra_data?.coingecko_id) {
            const response = await coin(extra_data.coingecko_id)
            data.token_data = !response?.error && response

            dispatch({
              type: STATUS_DATA,
              value: { ...data },
            })
          }
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(), 3 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [chains_data, blockchain_id])

  // chains-status
  useEffect(() => {
    const getChainStatus = async chain => {
      if (sdk_data && chain) {
        const response = await sdk_data.getSubgraphSyncStatus(chain.chain_id)

        dispatch({
          type: CHAINS_STATUS_DATA,
          value: response?.latestBlock > -1 && {
            ...chain,
            ...response,
          },
        })
      }
    }

    const getData = () => {
      if (sdk_data && chains_data) {
        chains_data.filter(c => !c?.disabled).forEach(c => getChainStatus(c))
      }
    }

    setTimeout(() => getData(), 15 * 1000)

    const interval = setInterval(() => getData(), 3 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk_data])

  // routers-status
  useEffect(() => {
    const getData = async () => {
      if (sdk_data) {
        if (routers_status_trigger) {
          dispatch({
            type: ROUTERS_STATUS_DATA,
            value: null,
          })
        }

        const response = await sdk_data.getRouterStatus(process.env.NEXT_PUBLIC_APP_NAME)

        if (response) {
          dispatch({
            type: ROUTERS_STATUS_DATA,
            value: response?.filter(r => r?.supportedChains?.findIndex(id => id && chains_data?.findIndex(c => c?.chain_id === id) > -1) > -1),
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
  }, [sdk_data, routers_status_trigger])

  // assets-balances & tokens
  useEffect(() => {
    const getAssetBalances = async chain => {
      if (chain && !chain.disabled) {
        const response = await assetBalances({ chain_id: chain.chain_id })
        const data = response?.data?.map(a => { return { ...a, chain } })

        dispatch({
          type: ASSET_BALANCES_DATA,
          value: { [`${chain.chain_id}`]: data },
        })

        const contractAddresses = _.uniq(
          _.concat(
            (data || []).map(a => a?.contract_address).filter(a => a && !(tokens_data?.findIndex(t => t?.chain_id === chain.chain_id && t?.contract_address === a) > -1)),
            (assets_data || []).flatMap(a => (a.contracts || []).filter(c => c?.chain_id === chain.chain_id).map(c => c?.contract_address)),
          ),
        )

        let tokenContracts

        if (contractAddresses.length > 0) {
          const responseTokens = await getTokens({ chain_id: chain.chain_id, addresses: contractAddresses.join(',') })
          tokenContracts = responseTokens?.data?.map(t => {
            const asset_data = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === chain.chain_id && c.contract_address.toLowerCase() === t.contract_address.toLowerCase()) > -1)
            return {
              ...t,
              ...asset_data,
              ...asset_data?.contracts?.find(c => c?.chain_id === chain.chain_id && c.contract_address.toLowerCase() === t.contract_address?.toLowerCase()),
              id: `${chain.chain_id}_${t.contract_address}`,
            }
          })
        }

        dispatch({
          type: TOKENS_DATA,
          value: tokenContracts || [],
        })
      }
    }

    const getData = is_interval => {
      if (chains_data && assets_data) {
        if (['/', '/routers', '/leaderboard/routers', '/transactions', '/status', '/router/[address]', '/address/[address]', '/[blockchain_id]'].includes(pathname)) {
          if (['/router/[address]', '/[blockchain_id]'].includes(pathname) || !asset_balances_data || !tokens_data || is_interval) {
            chains_data.forEach(c => getAssetBalances(c))
          }
        }
      }
    }

    getData()

    const interval = setInterval(() => getData(true), 5 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [chains_data, assets_data, pathname])

  // ens
  useEffect(() => {
    const getData = async () => {
      if (chains_data && asset_balances_data && chains_data.filter(c => !c?.disabled).length <= Object.keys(asset_balances_data).length) {
        const evmAddresses = _.uniq(Object.values(asset_balances_data).flatMap(ab => ab)?.map(a => a?.router?.id).filter(id => id && !ens_data?.[id]) || [])
        if (evmAddresses.length > 0) {
          let ensData
          const addressChunk = _.chunk(evmAddresses, 50)

          for (let i = 0; i < addressChunk.length; i++) {
            const domainsResponse = await domains({ where: `{ resolvedAddress_in: [${addressChunk[i].map(id => `"${id?.toLowerCase()}"`).join(',')}] }` })
            ensData = _.concat(ensData || [], domainsResponse?.data || [])
          }

          if (ensData?.length > 0) {
            const ensResponses = {}
            for (let i = 0; i < evmAddresses.length; i++) {
              const evmAddress = evmAddresses[i]?.toLowerCase()
              const resolvedAddresses = ensData.filter(d => d?.resolvedAddress?.id?.toLowerCase() === evmAddress)
              if (resolvedAddresses.length > 1) {
                ensResponses[evmAddress] = await getENS(evmAddress)
              }
              else if (resolvedAddresses.length < 1) {
                ensData.push({ resolvedAddress: { id: evmAddress } })
              }
            }

            dispatch({
              type: ENS_DATA,
              value: Object.fromEntries(ensData.filter(d => !ensResponses?.[d?.resolvedAddress?.id?.toLowerCase()]?.reverseRecord || d?.name === ensResponses?.[d?.resolvedAddress?.id?.toLowerCase()].reverseRecord).map(d => [d?.resolvedAddress?.id?.toLowerCase(), { ...d }])),
            })
          }
        }
      }
    }

    getData()
  }, [chains_data, asset_balances_data])

  // routers-assets
  useEffect(() => {
    if (asset_balances_data && tokens_data) {
      const routers = Object.entries(_.groupBy(Object.values(asset_balances_data || {}).flatMap(abs => abs), 'router.id')).map(([key, value]) => {
        return {
          router_id: key,
          asset_balances: value?.map(ab => {
            return {
              ...ab,
              asset: tokens_data.find(t => t?.chain_id === ab?.chain?.chain_id && t?.contract_address === ab?.contract_address),
            }
          }).map(ab => {
            const decimals = ab?.asset?.contract_decimals

            return {
              ...ab,
              amount: typeof decimals === 'number' && BigNumber(!isNaN(ab.amount) ? ab.amount : 0).shiftedBy(-decimals).toNumber(),
              locked: typeof decimals === 'number' && BigNumber(!isNaN(ab.locked) ? ab.locked : 0).shiftedBy(-decimals).toNumber(),
              lockedIn: typeof decimals === 'number' && BigNumber(!isNaN(ab.lockedIn) ? ab.lockedIn : 0).shiftedBy(-decimals).toNumber(),
              supplied: typeof decimals === 'number' && BigNumber(!isNaN(ab.supplied) ? ab.supplied : 0).shiftedBy(-decimals).toNumber(),
              removed: typeof decimals === 'number' && BigNumber(!isNaN(ab.removed) ? ab.removed : 0).shiftedBy(-decimals).toNumber(),
              volume: typeof decimals === 'number' && BigNumber(!isNaN(ab.volume) ? ab.volume : 0).shiftedBy(-decimals).toNumber(),
              volumeIn: typeof decimals === 'number' && BigNumber(!isNaN(ab.volumeIn) ? ab.volumeIn : 0).shiftedBy(-decimals).toNumber(),
              receivingFulfillTxCount: Number(ab.receivingFulfillTxCount),
            }
          }).map(ab => {
            const price = ab?.asset?.price

            return {
              ...ab,
              amount_value: typeof price === 'number' && typeof ab.amount === 'number' && (price * ab.amount),
              locked_value: typeof price === 'number' && typeof ab.locked === 'number' && (price * ab.locked),
              lockedIn_value: typeof price === 'number' && typeof ab.lockedIn === 'number' && (price * ab.lockedIn),
              supplied_value: typeof price === 'number' && typeof ab.supplied === 'number' && (price * ab.supplied),
              removed_value: typeof price === 'number' && typeof ab.removed === 'number' && (price * ab.removed),
              volume_value: typeof price === 'number' && typeof ab.volume === 'number' && (price * ab.volume),
              volumeIn_value: typeof price === 'number' && typeof ab.volumeIn === 'number' && (price * ab.volumeIn),
            }
          }),
        }
      })

      dispatch({
        type: ROUTERS_ASSETS_DATA,
        value: routers,
      })
    }
  }, [asset_balances_data, tokens_data])

  return (
    <>
      <div className="navbar border-b">
        <div className="navbar-inner w-full flex items-center">
          <Logo />
          <DropdownNavigation />
          <Navigation />
          <div className="flex items-center ml-auto">
            <Search />
            <Network />
            <button
              onClick={() => {
                dispatch({
                  type: THEME,
                  value: theme === 'light' ? 'dark' : 'light',
                })
              }}
              className="w-10 sm:w-12 h-16 btn-transparent flex items-center justify-center"
            >
              <div className="w-6 h-6 flex items-center justify-center">
                {theme === 'light' ? (
                  <FiMoon size={16} />
                ) : (
                  <FiSun size={16} />
                )}
              </div>
            </button>
          </div>
        </div>
      </div>
      <SubNavbar />
      <PageTitle />
    </>
  )
}