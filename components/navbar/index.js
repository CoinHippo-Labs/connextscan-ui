import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { create } from '@connext/sdk'
import { providers, utils } from 'ethers'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import Search from './search'
import Wallet from '../wallet'
import Chains from './chains'
import Theme from './theme'
import SubNavbar from './sub-navbar'
import { getChains, getAssets } from '../../lib/api/config'
import { assetsPrice } from '../../lib/api/assets'
import { ens as getEns } from '../../lib/api/ens'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { getPool } from '../../lib/object/pool'
import { split, toArray, equalsIgnoreCase, sleep } from '../../lib/utils'
import { CHAINS_DATA, ASSETS_DATA, POOL_ASSETS_DATA, ENS_DATA, ROUTER_ASSET_BALANCES_DATA, POOLS_DATA, SDK, RPCS } from '../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const {
    preferences,
    chains,
    assets,
    pool_assets,
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
  const {
    page_visible,
  } = { ...preferences }
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }
  const {
    pool_assets_data,
  } = { ...pool_assets }
  const {
    ens_data,
  } = { ...ens }
  const {
    router_asset_balances_data,
  } = { ...router_asset_balances }
  const {
    pools_data,
  } = { ...pools }
  const {
    rpcs,
  } = { ...rpc_providers }
  const {
    sdk,
  } = { ...dev }
  const {
    wallet_data,
  } = { ...wallet }
  const {
    default_chain_id,
    chain_id,
    provider,
    browser_provider,
    signer,
    address,
  } = { ...wallet_data }

  const router = useRouter()
  const {
    pathname,
    query,
  } = { ...router }
  const {
    chain,
  } = { ...query }

  const [currentAddress, setCurrentAddress] = useState(null)

  // chains
  useEffect(
    () => {
      const getData = async () => {
        const {
          evm,
        } = { ...await getChains() }

        if (evm) {
          dispatch(
            {
              type: CHAINS_DATA,
              value: evm,
            }
          )
        }
      }

      getData()
    },
    [],
  )

  // assets
  useEffect(
    () => {
      const getData = async () => {
        const response = toArray(await getAssets())

        dispatch(
          {
            type: ASSETS_DATA,
            value: response,
          }
        )

        dispatch(
          {
            type: POOL_ASSETS_DATA,
            value: getAsset(null, response, undefined, undefined, undefined, true, false, true, true),
          }
        )
      }

      getData()
    },
    [],
  )

  // price
  useEffect(
    () => {
      const getData = async is_interval => {
        if (page_visible && assets_data) {
          let updated_ids =
            assets_data
              .filter(a => !is_interval && typeof a.price === 'number')
              .map(a => a.id)

          if (updated_ids.length < assets_data.length) {
            let updated = false

            const assets =
              assets_data
                .filter(a => !updated_ids.includes(a.id))
                .map(a => a.id)

            if (assets.length > 0) {
              const response = toArray(await assetsPrice({ assets }))

              response
                .forEach(d => {
                  const index =
                    assets_data
                      .findIndex(a =>
                        equalsIgnoreCase(
                          a.id,
                          d?.asset_id,
                        )
                      )

                  if (index > -1) {
                    const asset_data = assets_data[index]
                    asset_data.price = d?.price || asset_data.price || 0
                    assets_data[index] = asset_data

                    updated_ids = _.uniq(_.concat(updated_ids, asset_data.id))
                    updated = true
                  }
                })
            }

            if (updated) {
              dispatch(
                {
                  type: ASSETS_DATA,
                  value: _.cloneDeep(assets_data),
                }
              )
            }
          }

          const pool_assets_data = getAsset(null, assets_data, undefined, undefined, undefined, true, false, true, true)

          if (pool_assets_data.findIndex(d => !updated_ids.includes(d?.id)) < 0) {
            dispatch(
              {
                type: POOL_ASSETS_DATA,
                value: pool_assets_data,
              }
            )
          }
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(true),
          5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [page_visible, assets_data],
  )

  // rpcs
  useEffect(
    () => {
      const createRpcProvider = (
        url,
        chain_id,
      ) =>
        new providers.StaticJsonRpcProvider(
          url,
          chain_id ?
            Number(chain_id) :
            undefined
        )

      const init = async => {
        if (chains_data) {
          const _rpcs = {}

          for (const chain_data of chains_data) {
            const {
              disabled,
              chain_id,
              provider_params,
            } = { ...chain_data }
            let {
              rpc_urls,
            } = { ...chain_data }

            if (!disabled) {
              rpc_urls = rpc_urls || toArray(_.head(provider_params)?.rpcUrls)

              _rpcs[chain_id] =
                rpc_urls.length > 1 ?
                  new providers.FallbackProvider(
                    rpc_urls
                      .map((url, i) => {
                        return {
                          priority: i + 1,
                          provider:
                            createRpcProvider(
                              url,
                              chain_id,
                            ),
                          stallTimeout: 1000,
                        }
                      }),
                    rpc_urls.length / 3,
                  ) :
                  createRpcProvider(
                    _.head(rpc_urls),
                    chain_id,
                  )
            }
          }

          if (!rpcs) {
            dispatch(
              {
                type: RPCS,
                value: _rpcs,
              }
            )
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
        if (
          !sdk &&
          chains_data &&
          assets_data &&
          assets_data.findIndex(a => typeof a.price !== 'number') < 0
        ) {
          const chains = {}

          for (const chain_data of chains_data) {
            const {
              disabled,
              chain_id,
              domain_id,
              provider_params,
            } = { ...chain_data }
            let {
              rpc_urls,
            } = { ...chain_data }

            if (!disabled && domain_id) {
              rpc_urls = rpc_urls || toArray(_.head(provider_params)?.rpcUrls)

              chains[domain_id] = {
                providers: rpc_urls,
                assets:
                  getAsset(null, assets_data, chain_id, undefined, undefined, true, false, false, true)
                    .map(a => {
                      const {
                        contracts,
                      } = { ...a }
                      let {
                        name,
                        symbol,
                      } = { ...a }

                      const contract_data = getContract(chain_id, contracts)

                      const {
                        contract_address,
                      } = { ...contract_data }

                      symbol = contract_data?.symbol || symbol
                      name = name || symbol

                      return {
                        name,
                        symbol,
                        address: contract_address,
                      }
                    }),
              }
            }
          }

          const sdkConfig = {
            network: process.env.NEXT_PUBLIC_NETWORK,
            environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
            logLevel: 'info',
            chains,
          }

          console.log(
            '[SDK config]',
            sdkConfig,
          )

          dispatch(
            {
              type: SDK,
              value: await create(sdkConfig),
            }
          )
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
        if (
          sdk &&
          address &&
          !equalsIgnoreCase(
            address,
            currentAddress,
          )
        ) {
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

          console.log(
            '[SDK change signer address]',
            address,
          )

          dispatch(
            {
              type: SDK,
              value: sdk,
            }
          )
        }
      }

      update()
    },
    [sdk, provider, browser_provider, signer, address, currentAddress],
  )

  // router asset balances
  useEffect(
    () => {
      const getData = async () => {
        if (
          page_visible &&
          sdk &&
          chains_data &&
          assets_data &&
          assets_data.findIndex(a => typeof a.price !== 'number') < 0
        ) {
          try {
            const response = toArray(await sdk.sdkUtils.getRoutersData())

            const data =
              _.groupBy(
                response
                  .filter(d => d?.address)
                  .map(d => {
                    const {
                      domain,
                      adopted,
                      local,
                      balance,
                    } = { ...d }

                    const chain_data = getChain(domain, chains_data)

                    const {
                      chain_id,
                    } = { ...chain_data }

                    let asset_data =
                      getAsset(null, assets_data, chain_id, undefined, undefined, false, false, false, true)
                        .find(a =>
                          getContract(adopted, toArray(a?.contracts), chain_id) ||
                          getContract(local, toArray(a?.contracts), chain_id)
                        )

                    asset_data = {
                      ...asset_data,
                      ...getContract(chain_id, asset_data?.contracts),
                    }

                    if (asset_data.contracts) {
                      delete asset_data.contracts
                    }

                    if (asset_data.next_asset && equalsIgnoreCase(asset_data.next_asset.contract_address, local)) {
                      asset_data = {
                        ...asset_data,
                        ...asset_data.next_asset,
                      }

                      delete asset_data.next_asset
                    }

                    const {
                      decimals,
                      price,
                    } = { ...asset_data }

                    const amount = utils.formatUnits(BigInt(balance || '0'), decimals || 18)

                    return {
                      ...d,
                      chain_id,
                      chain_data,
                      asset_data,
                      contract_address: local,
                      amount,
                      value: Number(amount) * (price || 0),
                    }
                  }),
                'chain_id',
              )

            dispatch(
              {
                type: ROUTER_ASSET_BALANCES_DATA,
                value: data,
              }
            )
          } catch (error) {}
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [page_visible, sdk, chains_data, assets_data],
  )

  // ens
  useEffect(
    () => {
      const getData = async () => {
        if (
          chains_data &&
          router_asset_balances_data &&
          getChain(null, chains_data, true, false, false, undefined, true).length <= Object.keys(router_asset_balances_data).length
        ) {
          const addresses =
            _.uniq(
              Object.values(router_asset_balances_data)
                .flatMap(a => a)
                .map(a => a?.router_address)
                .filter(a => a && !ens_data?.[a])
            )

          const _ens_data = await getEns(addresses)

          if (_ens_data) {
            dispatch(
              {
                type: ENS_DATA,
                value: _ens_data,
              }
            )
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
      const getPoolData = async (
        chain_data,
        asset_data,
      ) => {
        const {
          chain_id,
          domain_id,
        } = { ...chain_data }

        const {
          contracts,
        } = { ...asset_data }

        const contract_data = getContract(chain_id, contracts)

        const {
          contract_address,
        } = { ...contract_data }

        if (contract_address) {
          let data
          const id = `${chain_data.id}_${asset_data.id}`

          try {
            console.log(
              '[getPool]',
              {
                domain_id,
                contract_address,
              },
            )

            const pool = _.cloneDeep(await sdk.sdkPool.getPool(domain_id, contract_address))

            console.log(
              '[pool]',
              {
                domain_id,
                contract_address,
                pool,
              },
            )

            const {
              lpTokenAddress,
              adopted,
              local,
              symbol,
            } = { ...pool }

            let supply, tvl

            if (adopted) {
              const {
                balance,
                decimals,
              } = { ...adopted }

              adopted.balance =
                utils.formatUnits(
                  BigInt(balance || '0'),
                  decimals || 18,
                )

              pool.adopted = adopted
            }

            if (local) {
              const {
                balance,
                decimals,
              } = { ...local }

              local.balance =
                utils.formatUnits(
                  BigInt(balance || '0'),
                  decimals || 18,
                )

              pool.local = local
            }

            if (lpTokenAddress) {
              await sleep(1.5 * 1000)

              console.log(
                '[getTokenSupply]',
                {
                  domain_id,
                  lpTokenAddress,
                },
              )

              try {
                supply =
                  await sdk.sdkPool
                    .getTokenSupply(
                      domain_id,
                      lpTokenAddress,
                    )

                supply =
                  utils.formatUnits(
                    BigInt(supply || '0'),
                    18,
                  )

                console.log(
                  '[LPTokenSupply]',
                  {
                    domain_id,
                    lpTokenAddress,
                    supply,
                  },
                )
              } catch (error) {
                console.log(
                  '[getTokenSupply error]',
                  {
                    domain_id,
                    lpTokenAddress,
                  },
                  error,
                )
              }
            }

            let {
              price,
            } = { ...getAsset(asset_data.id, assets_data) }

            price = price || 0

            if (
              ['string', 'number'].includes(typeof supply) ||
              (adopted?.balance && local?.balance)
            ) {
              tvl =
                Number(
                  supply ||
                  _.sum(
                    toArray(
                      _.concat(adopted, local)
                    )
                    .map(a => Number(a.balance))
                  )
                ) * price
            }

            if (
              equalsIgnoreCase(
                pool?.domainId,
                domain_id,
              )
            ) {
              data = {
                ...pool,
                id,
                chain_id,
                chain_data,
                asset_data,
                contract_data,
                symbols: split(symbol, 'normal', '-'),
                supply: supply || pool?.supply,
                tvl,
                rate: 1,
              }
            }
            else {
              data = getPool(id, pools_data)
            }
          } catch (error) {
            console.log(
              '[getPool error]',
              {
                domain_id,
                contract_address,
              },
              error,
            )

            data =
              getPool(id, pools_data) ||
              {
                id,
                chain_id,
                chain_data,
                asset_data,
                contract_data,
                error,
              }
          }

          if (data) {
            dispatch(
              {
                type: POOLS_DATA,
                value: data,
              }
            )
          }
        }
      }

      const getChainData = async chain_data => pool_assets_data.forEach(a => getPoolData(chain_data, a))

      const getData = async () => {
        if (
          page_visible &&
          sdk &&
          chains_data &&
          pool_assets_data &&
          pool_assets_data.findIndex(a => typeof a?.price !== 'number') < 0
        ) {
          chains_data.forEach(c => getChainData(c))
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [page_visible, sdk, chains_data, pool_assets_data],
  )

  return (
    <>
      <div className="navbar">
        <div className="navbar-inner w-full sm:h-20 flex items-center justify-between">
          <div className="flex items-center">
            <Logo />
            <DropdownNavigations />
          </div>
          <div className="flex items-center justify-center">
            <Navigations />
          </div>
          <div className="flex items-center justify-end">
            <Search />
            <Chains />
            <Wallet
              hidden={true}
              mainController={true}
              connectChainId={default_chain_id}
            />
            <Theme />
          </div>
        </div>
      </div>
      <SubNavbar />
    </>
  )
}