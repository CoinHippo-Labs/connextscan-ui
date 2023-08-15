import Head from 'next/head'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import PageVisibility from 'react-page-visibility'
import { create } from '@connext/sdk-core'
import _ from 'lodash'

import Navbar from '../components/navbar'
import Footer from '../components/footer'
import meta from '../lib/meta'
import { getTokensPrice } from '../lib/api/tokens'
import { getENS } from '../lib/api/ens'
import { getProvider } from '../lib/chain/evm'
import { NETWORK, ENVIRONMENT, IS_STAGING, getChainsData, getAssetsData } from '../lib/config'
import { getChainData, getAssetData, getContractData, getPoolData } from '../lib/object'
import { formatUnits, isNumber } from '../lib/number'
import { split, toArray, equalsIgnoreCase, sleep } from '../lib/utils'
import { THEME, PAGE_VISIBLE, CHAINS_DATA, ASSETS_DATA, POOL_ASSETS_DATA, GAS_TOKENS_PRICE_DATA, ENS_DATA, ROUTER_ASSET_BALANCES_DATA, POOLS_DATA, RPCS, SDK, LATEST_BUMPED_TRANSFERS_DATA } from '../reducers/types'

export default ({ children }) => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    assets,
    pool_assets,
    gas_tokens_price,
    ens,
    router_asset_balances,
    pools,
    rpc_providers,
    dev,
    wallet,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        pool_assets: state.pool_assets,
        gas_tokens_price: state.gas_tokens_price,
        ens: state.ens,
        router_asset_balances: state.router_asset_balances,
        pools: state.pools,
        rpc_providers: state.rpc_providers,
        dev: state.dev,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
  const { theme, page_visible } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { pool_assets_data } = { ...pool_assets }
  const { gas_tokens_price_data } = { ...gas_tokens_price }
  const { ens_data } = { ...ens }
  const { router_asset_balances_data } = { ...router_asset_balances }
  const { pools_data } = { ...pools }
  const { rpcs } = { ...rpc_providers }
  const { sdk } = { ...dev }
  const { wallet_data } = { ...wallet }
  const { provider, ethereum_provider, signer, address } = { ...wallet_data }

  const router = useRouter()
  const { pathname, query, asPath } = { ...router }
  const { chain } = { ...query }

  const [currentAddress, setCurrentAddress] = useState(null)

  // preferences
  useEffect(
    () => {
      if (typeof window !== 'undefined') {
        const _theme = localStorage.getItem(THEME)
        if (_theme && _theme !== theme) {
          dispatch({ type: THEME, value: _theme })
        }
        const _latest_bumped_transfers_data = localStorage.getItem(LATEST_BUMPED_TRANSFERS_DATA)
        if (_latest_bumped_transfers_data) {
          dispatch({ type: LATEST_BUMPED_TRANSFERS_DATA, value: _latest_bumped_transfers_data })
        }
      }
    },
    [theme],
  )

  // chains
  useEffect(
    () => {
      const getData = () => {
        dispatch({ type: CHAINS_DATA, value: getChainsData() })
      }
      getData()
    },
    [],
  )

  // assets
  useEffect(
    () => {
      const getData = async is_interval => {
        let assets = getAssetsData()
        const response = toArray(await getTokensPrice({ assets: assets.map(a => a.id) }))
        if (response.length > 0) {
          response.forEach(d => {
            const { asset_id, price } = { ...d }
            const index = assets.findIndex(_d => _d.id === asset_id)
            if (index > -1) {
              const asset_data = assets[index]
              asset_data.price = price || toArray(assets_data).find(_d => _d.id === asset_id)?.price || 0
              assets[index] = asset_data
            }
          })
        }
        else if (is_interval) {
          assets = assets_data
        }
        dispatch({ type: ASSETS_DATA, value: assets })
        dispatch({ type: POOL_ASSETS_DATA, value: getAssetData(undefined, assets, { not_disabled: true, only_pool_asset: true, return_all: true }) })
      }

      getData()
      const interval = setInterval(() => getData(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [],
  )

  // gas tokens
  useEffect(
    () => {
      const getData = async is_interval => {
        if (page_visible && chains_data) {
          const updated_ids = toArray(gas_tokens_price_data).filter(d => !is_interval && typeof d.price === 'number').map(d => d.asset_id)
          const symbols = toArray(chains_data.map(c => c.native_token?.symbol), 'lower')

          if (updated_ids.length < symbols.length) {
            const assets = symbols.filter(s => !updated_ids.includes(s))
            if (assets.length > 0) {
              const response = toArray(await getTokensPrice({ assets }))
              let data = _.cloneDeep(gas_tokens_price_data)
              if (data) {
                response.forEach(d => {
                  const { asset_id } = { ...d }
                  const index = data.findIndex(_d => _d.asset_id === asset_id)
                  if (index > -1) {
                    data[index] = d
                  }
                  else {
                    data.push(d)
                  }
                })
              }
              else {
                data = response
              }
              dispatch({ type: GAS_TOKENS_PRICE_DATA, value: data })
            }
          }
        }
      }

      getData()
      const interval = setInterval(() => getData(true), 5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chains_data, gas_tokens_price_data],
  )

  // rpcs
  useEffect(
    () => {
      const init = async => {
        if (chains_data) {
          const data = {}
          for (const chain_data of chains_data) {
            const { id, chain_id } = { ...chain_data }
            data[chain_id] = getProvider(id, chains_data)
          }
          if (!rpcs) {
            dispatch({ type: RPCS, value: data })
          }
        }
      }
      init()
    },
    [chains_data],
  )

  // sdk
  useEffect(
    () => {
      const init = async () => {
        if (!sdk && chains_data && assets_data) {
          const chains = {}
          for (const chain_data of chains_data) {
            const { chain_id, domain_id, private_rpcs, disabled } = { ...chain_data }
            let { rpcs } = { ...chain_data }
            rpcs = toArray(private_rpcs || rpcs)
            if (domain_id && !disabled) {
              chains[domain_id] = {
                providers: rpcs,
                assets: getAssetData(undefined, assets_data, { chain_id, not_disabled: true, return_all: true }).map(a => {
                  const { contracts } = { ...a }
                  let { name, symbol } = { ...a }
                  const contract_data = getContractData(chain_id, contracts)
                  const { contract_address } = { ...contract_data }
                  symbol = contract_data?.symbol || symbol
                  name = name || symbol
                  return { name, symbol, address: contract_address }
                }),
              }
            }
          }

          const sdkConfig = {
            network: NETWORK,
            environment: ENVIRONMENT,
            logLevel: 'info',
            chains,
          }
          console.log('[General]', '[SDK config]', sdkConfig)
          dispatch({ type: SDK, value: await create(sdkConfig) })
        }
      }
      init()
    },
    [chains_data, assets_data, sdk],
  )

  // sdk change signer
  useEffect(
    () => {
      const update = async () => {
        if (sdk && address && !equalsIgnoreCase(address, currentAddress)) {
          if (sdk.sdkBase) {
            await sdk.sdkBase.changeSignerAddress(address)
          }
          if (sdk.sdkRouter) {
            await sdk.sdkRouter.changeSignerAddress(address)
          }
          if (sdk.sdkPool) {
            await sdk.sdkPool.changeSignerAddress(address)
          }
          setCurrentAddress(address)
          console.log('[General]', '[SDK change signer address]', address)
          dispatch({ type: SDK, value: sdk })
        }
      }
      update()
    },
    [sdk, provider, ethereum_provider, signer, address, currentAddress],
  )

  // router asset balances
  useEffect(
    () => {
      const getData = async () => {
        if (page_visible && chains_data && assets_data && sdk) {
          try {
            const response = toArray(await sdk.sdkUtils.getRoutersData())
            const data = _.groupBy(
              response.map(d => {
                const { domain, adopted, local, balance, decimal, asset_usd_price } = { ...d }
                const chain_data = getChainData(domain, chains_data)
                const { chain_id } = { ...chain_data }
                const asset_data = getAssetData(undefined, assets_data, { chain_id, return_all: true }).find(a => [adopted, local].findIndex(c => getContractData(c, toArray(a.contracts), { chain_id })) > -1)
                const amount = formatUnits(BigInt(balance || '0').toString(), decimal)
                const value = amount * asset_usd_price
                return {
                  ...d,
                  chain_id,
                  chain_data,
                  asset_data,
                  contract_address: local,
                  amount,
                  value,
                }
              }),
              'chain_id',
            )
            dispatch({ type: ROUTER_ASSET_BALANCES_DATA, value: data })
          } catch (error) {}
        }
      }

      getData()
      const interval = setInterval(() => getData(), 3 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chains_data, assets_data, sdk],
  )

  // ens
  useEffect(
    () => {
      const getData = async () => {
        if (chains_data && router_asset_balances_data && getChainData(undefined, chains_data, { not_disabled: true, return_all: true }).length <= Object.keys(router_asset_balances_data).length) {
          const data = await getENS(_.uniq(Object.values(router_asset_balances_data).flatMap(d => toArray(d)).map(d => d.router_address).filter(a => a && !ens_data?.[a])))
          if (data) {
            dispatch({ type: ENS_DATA, value: data })
          }
        }
      }
      getData()
    },
    [chains_data, router_asset_balances_data],
  )

  // pools
  useEffect(
    () => {
      const getPool = async (chain_data, asset_data) => {
        const { chain_id, domain_id } = { ...chain_data }
        const { contracts } = { ...asset_data }
        const contract_data = getContractData(chain_id, contracts)
        const { contract_address } = { ...contract_data }

        if (contract_address) {
          const id = [chain_data.id, asset_data.id].join('_')

          let data
          try {
            console.log('[General]', '[getPool]', { domain_id, contract_address })
            const pool = _.cloneDeep(await sdk.sdkPool.getPool(domain_id, contract_address))
            console.log('[General]', '[pool]', { domain_id, contract_address, pool })
            const { lpTokenAddress, adopted, local, symbol } = { ...pool }

            let supply
            let tvl
            let stats

            if (adopted) {
              const { balance, decimals } = { ...adopted }
              adopted.balance = formatUnits(balance, decimals)
              pool.adopted = adopted
            }
            if (local) {
              const { balance, decimals } = { ...local }
              local.balance = formatUnits(balance, decimals)
              pool.local = local
            }

            /*if (lpTokenAddress) {
              await sleep(1.5 * 1000)
              console.log('[General]', '[getTokenSupply]', { domain_id, lpTokenAddress })
              try {
                supply = await sdk.sdkPool.getTokenSupply(domain_id, lpTokenAddress)
                supply = formatUnits(supply)
                console.log('[General]', '[LPTokenSupply]', { domain_id, lpTokenAddress, supply })
              } catch (error) {
                console.log('[General]', '[getTokenSupply error]', { domain_id, lpTokenAddress }, error)
              }
            }*/
            supply = supply || pool?.supply
            let { price } = { ...getAssetData(asset_data.id, assets_data) }
            price = price || 0
            if (isNumber(supply) || (adopted?.balance && local?.balance)) {
              tvl = Number(supply || _.sum(toArray(_.concat(adopted, local)).map(a => Number(a.balance)))) * price
            }

            /*if (pool && (IS_STAGING || ENVIRONMENT === 'production')) {
              await sleep(1.5 * 1000)
              const number_of_days = 7
              console.log('[General]', '[getYieldData]', { domain_id, contract_address, number_of_days })
              try {
                stats = _.cloneDeep(await sdk.sdkPool.getYieldData(domain_id, contract_address, number_of_days))
                console.log('[General]', '[yieldData]', { domain_id, contract_address, number_of_days, stats })
              } catch (error) {
                console.log('[General]', '[getYieldData error]', { domain_id, contract_address, number_of_days }, error)
              }
            }*/

            if (equalsIgnoreCase(pool?.domainId, domain_id)) {
              const { liquidity, volumeFormatted, fees } = { ...stats }
              data = {
                ...pool,
                ...stats,
                id,
                chain_id,
                chain_data,
                asset_data,
                contract_data,
                symbols: split(symbol, 'normal', '-'),
                supply,
                tvl,
                volume: volumeFormatted,
                rate: 1,
                liquidity_value: (liquidity || 0) * price,
                volume_value: (volumeFormatted || 0) * price,
                fees_value: (fees || 0) * price,
              }
            }
            else {
              data = getPoolData(id, pools_data)
            }
          } catch (error) {
            console.log('[General]', '[getPool error]', { domain_id, contract_address }, error)
            data = getPoolData(id, pools_data) || { id, chain_id, chain_data, asset_data, contract_data, error }
          }
          if (data) {
            dispatch({ type: POOLS_DATA, value: data })
          }
        }
      }

      const getChainData = async chain_data => pool_assets_data.forEach(a => getPool(chain_data, a))

      const getData = async () => {
        if (page_visible && chains_data && pool_assets_data && sdk && pathname && ['/', '/[chain]'].includes(pathname)) {
          chains_data.filter(c => !pathname.includes('/[') || asPath?.includes(c.id)).forEach(c => getChainData(c))
        }
      }

      getData()
      const interval = setInterval(() => getData(), 1.5 * 60 * 1000)
      return () => clearInterval(interval)
    },
    [page_visible, chains_data, pool_assets_data, sdk, pathname, chain],
  )

  const { title, description, image, url } = { ...meta(asPath) }

  return (
    <>
      <Head>
        <title>
          {title}
        </title>
        <meta
          name="og:site_name"
          property="og:site_name"
          content={title}
        />
        <meta
          name="og:title"
          property="og:title"
          content={title}
        />
        <meta
          itemProp="name"
          content={title}
        />
        <meta
          itemProp="headline"
          content={title}
        />
        <meta
          itemProp="publisher"
          content={title}
        />
        <meta
          name="twitter:title"
          content={title}
        />

        <meta
          name="description"
          content={description}
        />
        <meta
          name="og:description"
          property="og:description"
          content={description}
        />
        <meta
          itemProp="description"
          content={description}
        />
        <meta
          name="twitter:description"
          content={description}
        />

        <meta
          name="og:image"
          property="og:image"
          content={image}
        />
        <meta
          itemProp="thumbnailUrl"
          content={image}
        />
        <meta
          itemProp="image"
          content={image}
        />
        <meta
          name="twitter:image"
          content={image}
        />
        <link
          rel="image_src"
          href={image}
        />

        <meta
          name="og:url"
          property="og:url"
          content={url}
        />
        <meta
          itemProp="url"
          content={url}
        />
        <meta
          name="twitter:url"
          content={url}
        />
        <link
          rel="canonical"
          href={url}
        />
      </Head>
      <PageVisibility onChange={v => dispatch({ type: PAGE_VISIBLE, value: v })}>
        <div
          data-layout="layout"
          data-background={theme}
          data-navbar={theme}
          className={`min-h-screen antialiased disable-scrollbars text-sm ${theme}`}
        >
          <div className="wrapper">
            <div className="main w-full bg-white dark:bg-black" style={{ backgroundColor: theme === 'light' ? '#ececec' : '#1a1919' }}>
              <Navbar />
              <div className="w-full">
                {children}
              </div>
            </div>
          </div>
          <Footer />
        </div>
      </PageVisibility>
    </>
  )
}