import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { create } from '@connext/sdk'
import { BigNumber, providers, utils } from 'ethers'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import Search from './search'
import Wallet from '../wallet'
import Chains from './chains'
import Theme from './theme'
import SubNavbar from './sub-navbar'
import { chains as getChains, assets as getAssets } from '../../lib/api/config'
import { assets as getAssetsPrice } from '../../lib/api/assets'
import { ens as getEns } from '../../lib/api/ens'
import { connext } from '../../lib/object/chain'
import { equals_ignore_case, sleep } from '../../lib/utils'
import { CHAINS_DATA, ASSETS_DATA, POOL_ASSETS_DATA, ENS_DATA, CHAIN_DATA, ASSET_BALANCES_DATA, POOLS_DATA, SDK, RPCS } from '../../reducers/types'

const WRAPPED_PREFIX =
  process.env.NEXT_PUBLIC_WRAPPED_PREFIX ||
  'next'

export default () => {
  const dispatch = useDispatch()
  const {
    chains,
    assets,
    pool_assets,
    ens,
    asset_balances,
    pools,
    rpc_providers,
    dev,
    wallet,
  } = useSelector(state =>
    (
      {
        chains: state.chains,
        assets: state.assets,
        pool_assets: state.pool_assets,
        ens: state.ens,
        asset_balances: state.asset_balances,
        pools: state.pools,
        rpc_providers: state.rpc_providers,
        dev: state.dev,
        wallet: state.wallet,
      }
    ),
    shallowEqual,
  )
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
    asset_balances_data,
  } = { ...asset_balances }
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
    web3_provider,
    address,
    signer,
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
          cosmos,
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
        const response = await getAssets()

        if (Array.isArray(response)) {
          dispatch(
            {
              type: ASSETS_DATA,
              value: response,
            }
          )

          dispatch(
            {
              type: POOL_ASSETS_DATA,
              value:
                response
                  .map(d => {
                    const {
                      contracts,
                    } = { ...d }

                    return {
                      ...d,
                      contracts:
                        (contracts || [])
                          .filter(c =>
                            c?.is_pool
                          ),
                    }
                  })
                  .filter(d =>
                    d.contracts.length > 0
                  ),
            }
          )
        }
      }

      getData()
    },
    [],
  )

  // price
  useEffect(
    () => {
      const getData = async is_interval => {
        if (
          chains_data &&
          assets_data
        ) {
          let updated_ids =
            is_interval ?
              [] :
              assets_data
                .filter(a =>
                  typeof a.price === 'number'
                )
                .map(a => a.id)

          if (updated_ids.length < assets_data.length) {
            let updated = false

            for (const chain_data of chains_data) {
              const {
                chain_id,
              } = { ...chain_data }

              if (chain_id) {
                const addresses =
                  assets_data
                    .filter(a =>
                      !updated_ids.includes(a?.id) &&
                      (a?.contracts || [])
                        .findIndex(c =>
                          c?.chain_id === chain_id &&
                          c.contract_address
                        ) > -1
                    )
                    .map(a =>
                      a.contracts
                        .find(c =>
                          c?.chain_id === chain_id
                        ).contract_address
                    )

                if (addresses.length > 0) {
                  const response =
                    await getAssetsPrice(
                      {
                        chain_id,
                        addresses,
                      },
                    )

                  if (Array.isArray(response)) {
                    response
                      .forEach(t => {
                        const asset_index =
                          assets_data
                            .findIndex(a =>
                              a?.id &&
                              (a.contracts || [])
                                .findIndex(c =>
                                  c?.chain_id === t?.chain_id &&
                                  equals_ignore_case(
                                    c.contract_address,
                                    t?.contract_address,
                                  )
                                ) > -1
                            )

                        if (asset_index > -1) {
                          const asset = assets_data[asset_index]

                          asset.price =
                            t?.price ||
                            asset.price ||
                            0

                          assets_data[asset_index] = asset

                          updated_ids =
                            _.uniq(
                              _.concat(
                                updated_ids,
                                asset.id,
                              )
                            )

                          updated = true
                        }
                      })
                  }
                }
              }
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
        }
      }

      getData()

      const interval =
        setInterval(() =>
          getData(true),
          5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [chains_data, assets_data],
  )

  // rpcs
  useEffect(
    () => {
      const init = async => {
        if (chains_data) {
          const _rpcs = {}

          for (const chain_data of chains_data) {
            const {
              disabled,
              chain_id,
              provider_params,
            } = { ...chain_data }

            if (!disabled) {
              const {
                rpcUrls,
              } = { ..._.head(provider_params) }
   
              const rpc_urls =
                (rpcUrls || [])
                  .filter(url => url)

              const provider =
                rpc_urls.length === 1 ?
                  new providers.StaticJsonRpcProvider(
                    _.head(rpc_urls),
                    chain_id,
                  ) :
                  new providers.FallbackProvider(
                    rpc_urls
                      .map((url, i) => {
                        return {
                          provider:
                            new providers.StaticJsonRpcProvider(
                              url,
                              chain_id,
                            ),
                          priority: i + 1,
                          stallTimeout: 1000,
                        }
                      }),
                    rpc_urls.length / 3,
                  )

              _rpcs[chain_id] = provider
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
          assets_data
            .findIndex(a =>
              typeof a.price !== 'number'
            ) < 0
        ) {
          const chains_config = {}

          for (const chain_data of chains_data) {
            const {
              chain_id,
              domain_id,
              provider_params,
              disabled,
            } = { ...chain_data }

            if (!disabled) {
              const {
                rpcUrls,
              } = { ..._.head(provider_params) }
   
              const rpc_urls =
                (rpcUrls || [])
                  .filter(url => url)

              if (domain_id) {
                chains_config[domain_id] = {
                  providers: rpc_urls,
                  assets:
                    assets_data
                      .filter(a =>
                        (a?.contracts || [])
                          .findIndex(c =>
                            c?.chain_id === chain_id
                          ) > -1
                      )
                      .map(a => {
                        const {
                          contracts,
                        } = { ...a }
                        let {
                          name,
                          symbol,
                        } = { ...a }

                        const contract_data = contracts
                          .find(c =>
                            c?.chain_id === chain_id
                          )
                        const {
                          contract_address,
                        } = { ...contract_data }

                        symbol =
                          contract_data?.symbol ||
                          symbol

                        name =
                          name ||
                          symbol

                        return {
                          name,
                          symbol,
                          address: contract_address,
                        }
                      }),
                }
              }
            }
          }

          const sdkConfig = {
            chains: chains_config,
            // signerAddress: address,
            logLevel: 'info',
            network: process.env.NEXT_PUBLIC_NETWORK,
            environment: process.env.NEXT_PUBLIC_ENVIRONMENT,
          }

          console.log(
            '[SDK config]',
            sdkConfig,
          )

          dispatch(
            {
              type: SDK,
              value:
                await create(
                  sdkConfig,
                ),
            }
          )
        }
      }

      init()
    },
    [chains_data, assets_data, sdk],
  )

  // sdk
  useEffect(
    () => {
      const update = async () => {
        if (
          sdk &&
          address &&
          !equals_ignore_case(
            address,
            currentAddress,
          )
        ) {
          if (sdk.sdkBase) {
            await sdk.sdkBase
              .changeSignerAddress(
                address,
              )
          }

          if (sdk.sdkRouter) {
            await sdk.sdkRouter
              .changeSignerAddress(
                address,
              )
          }

          if (sdk.sdkPool) {
            await sdk.sdkPool
              .changeSignerAddress(
                address,
              )
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
    [sdk, provider, web3_provider, address, signer, currentAddress],
  )

  // assets balances
  useEffect(
    () => {
      const getData = async is_interval => {
        if (
          sdk &&
          chains_data &&
          assets_data &&
          assets_data
            .findIndex(a =>
              typeof a.price !== 'number'
            ) < 0 &&
          ![
            '/tx/[tx]',
          ].includes(pathname) &&
          (
            !asset_balances_data ||
            is_interval
          )
        ) {
          const response =
            await sdk.sdkUtils
              .getRoutersData()

          if (
            response ||
            !is_interval
          ) {
            const data =
              _.groupBy(
                (Array.isArray(response) ?
                  response
                    .filter(r =>
                      r?./*router_*/address
                    ) :
                  []
                )
                .map(l => {
                  const {
                    domain,
                    local,
                    balance,
                  } = { ...l }

                  const chain_data = chains_data
                    .find(c =>
                      c?.domain_id === domain
                    )
                  const {
                    chain_id,
                  } = { ...chain_data }

                  let asset_data = assets_data
                    .find(a =>
                      (a?.contracts || [])
                        .findIndex(c =>
                          c?.chain_id === chain_id &&
                          [
                            c?.next_asset?.contract_address,
                            c?.contract_address,
                          ]
                          .filter(_a => _a)
                          .findIndex(_a =>
                            equals_ignore_case(
                              _a,
                              local,
                            )
                          ) > -1
                        ) > -1
                    )

                  asset_data = {
                    ...asset_data,
                    ...(
                      (asset_data?.contracts || [])
                        .find(c =>
                          c?.chain_id === chain_id &&
                          [
                            c?.next_asset?.contract_address,
                            c?.contract_address,
                          ]
                          .filter(_a => _a)
                          .findIndex(_a =>
                            equals_ignore_case(
                              _a,
                              local,
                            )
                          ) > -1
                        )
                    ),
                  }

                  if (asset_data.contracts) {
                    delete asset_data.contracts
                  }

                  if (
                    asset_data.next_asset &&
                    equals_ignore_case(
                      asset_data.next_asset.contract_address,
                      local,
                    )
                  ) {
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

                  const amount =
                    Number(
                      utils.formatUnits(
                        BigNumber.from(
                          BigInt(
                            balance ||
                            0
                          ).toString()
                        ),
                        decimals ||
                        18,
                      )
                    )

                  const value =
                    amount *
                    (
                      price ||
                      0
                    )

                  return {
                    ...l,
                    chain_id,
                    chain_data,
                    contract_address: local,
                    asset_data,
                    amount,
                    value,
                  }
                }),
                'chain_id',
              )

            dispatch(
              {
                type: ASSET_BALANCES_DATA,
                value: data,
              }
            )
          }
        }
      }

      getData()

      const interval =
        setInterval(() =>
          getData(true),
          5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [sdk, chains_data, assets_data, pathname],
  )

  // ens
  useEffect(
    () => {
      const getData = async () => {
        if (
          chains_data &&
          asset_balances_data &&
          chains_data
            .filter(c =>
              !c?.disabled
            )
            .length <=
            Object.keys(asset_balances_data).length
        ) {
          const addresses =
            _.uniq(
              Object.values(asset_balances_data)
                .flatMap(a => a)
                .map(a => a?./*router_*/address)
                .filter(a => a && !ens_data?.[a])
            )

          const ens_data = await getEns(addresses)

          if (ens_data) {
            dispatch(
              {
                type: ENS_DATA,
                value: ens_data,
              }
            )
          }
        }
      }

      getData()
    },
    [address],
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

        const contract_data = (contracts || [])
          .find(c =>
            c?.chain_id === chain_id
          )
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

            const pool =
              await sdk.sdkPool
                .getPool(
                  domain_id,
                  contract_address,
                )

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
            } = { ...pool }
            let {
              name,
              symbol,
            } = { ...pool }

            if (symbol?.includes(`${WRAPPED_PREFIX}${WRAPPED_PREFIX}`)) {
              name =
                (name || '')
                  .replace(
                    WRAPPED_PREFIX,
                    '',
                  )

              symbol =
                symbol
                  .split('-')
                  .map(s =>
                    s
                      .replace(
                        WRAPPED_PREFIX,
                        '',
                      )
                  )
                  .join('-')

              pool.name = name
              pool.symbol = symbol
            }

            if (symbol?.includes('-')) {
              const symbols =
                symbol
                  .split('-')

              if (
                equals_ignore_case(
                  _.head(symbols),
                  _.last(symbols),
                ) &&
                adopted?.symbol &&
                local?.symbol
              ) {
                symbol =
                  [
                    adopted.symbol,
                    local.symbol,
                  ]
                  .join('-')

                pool.symbol = symbol
              }
            }

            const symbols =
              (symbol || '')
                .split('-')
                .filter(s => s)

            if (adopted) {
              const {
                balance,
                decimals,
              } = { ...adopted }

              adopted.balance =
                typeof balance === 'string' ?
                  balance :
                  utils.formatUnits(
                    BigNumber.from(
                      balance ||
                      '0'
                    ),
                    decimals ||
                    18,
                  )

              pool.adopted = adopted
            }

            if (local) {
              const {
                balance,
                decimals,
              } = { ...local }

              local.balance =
                typeof balance === 'string' ?
                  balance :
                  utils.formatUnits(
                    BigNumber.from(
                      balance ||
                      '0'
                    ),
                    decimals ||
                    18,
                  )

              pool.local = local
            }

            let supply

            if (lpTokenAddress) {
              await sleep(0.5 * 1000)

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
                    BigNumber.from(
                      supply
                    ),
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

            let rate = 1

            if (
              pool &&
              !rate
            ) {
              console.log(
                '[getVirtualPrice]',
                {
                  domain_id,
                  contract_address,
                },
              )

              try {
                rate =
                  await sdk.sdkPool
                    .getVirtualPrice(
                      domain_id,
                      contract_address,
                    )

                rate =
                  Number(
                    utils.formatUnits(
                      BigNumber.from(
                        rate ||
                        '0'
                      ),
                      18,
                    )
                  )

                console.log(
                  '[virtualPrice]',
                  {
                    domain_id,
                    contract_address,
                    rate,
                  },
                )
              } catch (error) {
                console.log(
                  '[getVirtualPrice error]',
                  {
                    domain_id,
                    contract_address,
                  },
                  error,
                )
              }
            }

            let tvl

            if (
              [
                'string',
                'number',
              ].includes(typeof supply) ||
              (
                adopted?.balance &&
                local?.balance
              )
            ) {
              const {
                price,
              } = {
                ...(
                  (assets_data || [])
                    .find(a =>
                      a?.id === asset_data.id
                    )
                ),
              }

              tvl =
                typeof price === 'number' ?
                  (
                    supply ||
                    _.sum(
                      [
                        adopted,
                        local,
                      ]
                      .filter(t => t)
                      .map(t => {
                        const {
                          balance,
                          index,
                        } = { ...t }

                        return (
                          Number(
                            balance ||
                            '0'
                          ) /
                          (
                            index > 0 &&
                            rate > 0 ?
                              rate :
                              1
                          )
                        )
                      })
                    )
                  ) *
                  price :
                  0
            }

            if (
              equals_ignore_case(
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
                symbols,
                supply:
                  supply ||
                  pool?.supply,
                rate,
                tvl,
              }
            }
            else {
              data =
                (pools_data || [])
                  .find(p =>
                    equals_ignore_case(
                      p?.id,
                      id,
                    )
                  )
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
              (pools_data || [])
                .find(p =>
                  equals_ignore_case(
                    p?.id,
                    id,
                  )
                ) ||
              {
                id: `${chain_data.id}_${asset_data.id}`,
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

      const getChainData = async chain_data => {
        if (
          sdk &&
          chain_data
        ) {
          pool_assets_data
            .forEach(a =>
              getPoolData(
                chain_data,
                a,
              )
            )
        }
      }

      const getData = async () => {
        if (
          sdk &&
          chains_data &&
          pool_assets_data
        ) {
          chains_data
            .forEach(c =>
              getChainData(c)
            )
        }
      }

      getData()

      const interval =
        setInterval(() =>
          getData(),
          1 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [/*pathname, */sdk, chains_data, pool_assets_data],
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