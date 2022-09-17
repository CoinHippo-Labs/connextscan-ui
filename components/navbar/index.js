import { useRouter } from 'next/router'
import { useEffect } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { create } from '@connext/nxtp-sdk'
import { BigNumber, providers, utils } from 'ethers'

import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import Search from './search'
import Chains from './chains'
import Theme from './theme'
import SubNavbar from './sub-navbar'
import { chains as getChains, assets as getAssets } from '../../lib/api/config'
import { assets as getAssetsPrice } from '../../lib/api/assets'
import { ens as getEns } from '../../lib/api/ens'
import { connext } from '../../lib/object/chain'
import { equals_ignore_case } from '../../lib/utils'
import { CHAINS_DATA, ASSETS_DATA, ENS_DATA, CHAIN_DATA, ASSET_BALANCES_DATA, SDK, RPCS } from '../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const {
    chains,
    assets,
    ens,
    asset_balances,
    rpc_providers,
    dev,
    wallet,
  } = useSelector(state =>
    (
      {
        chains: state.chains,
        assets: state.assets,
        ens: state.ens,
        asset_balances: state.asset_balances,
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
    ens_data,
  } = { ...ens }
  const {
    asset_balances_data,
  } = { ...asset_balances }
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

  // chains
  useEffect(() => {
    const getData = async () => {
      const {
        evm,
        cosmos,
      } = { ...await getChains() }

      if (evm) {
        dispatch({
          type: CHAINS_DATA,
          value: evm,
        })
      }
    }

    getData()
  }, [])

  // assets
  useEffect(() => {
    const getData = async () => {
      const response = await getAssets()

      if (Array.isArray(response)) {
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
      if (
        chains_data &&
        assets_data
      ) {
        let updated_ids = is_interval ?
        [] :
        assets_data
          .filter(a => a?.price)
          .map(a => a.id)

        if (updated_ids.length < assets_data.length) {
          let updated = false

          for (const chain_data of chains_data) {
            const {
              chain_id,
            } = { ...chain_data }

            if (chain_id) {
              const addresses = assets_data
                .filter(a =>
                  !updated_ids.includes(a?.id) &&
                  a?.contracts?.findIndex(c =>
                    c?.chain_id === chain_id &&
                    c?.contract_address
                  ) > -1
                )
                .map(a =>
                  a.contracts.find(c => c?.chain_id === chain_id)
                    .contract_address
                )

              if (addresses.length > 0) {
                const response = await getAssetsPrice(
                  {
                    chain_id,
                    addresses,
                  },
                )

                if (Array.isArray(response)) {
                  response.forEach(a => {
                    const asset_index = assets_data.findIndex(_a =>
                      _a?.id &&
                      _a.contracts?.findIndex(c =>
                        c?.chain_id === a?.chain_id &&
                        equals_ignore_case(c.contract_address, a?.contract_address)
                      ) > -1
                    )

                    if (asset_index > -1) {
                      const asset_data = assets_data[asset_index]
                      const {
                        id,
                      } = { ...asset_data }
                      let {
                        price,
                      } = { ...asset_data }

                      price = a?.price ||
                        price

                      assets_data[asset_index] = {
                        ...asset_data,
                        price,
                      }

                      updated_ids = _.uniq(
                        _.concat(
                          updated_ids,
                          id,
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
            dispatch({
              type: ASSETS_DATA,
              value: _.cloneDeep(assets_data),
            })
          }
        }
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(true),
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [chains_data, assets_data])

  // rpcs
  useEffect(() => {
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
 
            const rpc_urls = (rpcUrls || [])
              .filter(url => url)

            const provider = rpc_urls.length === 1 ?
              new providers.JsonRpcProvider(rpc_urls[0]) :
              new providers.FallbackProvider(
                rpc_urls.map((url, i) => {
                  return {
                    provider: new providers.JsonRpcProvider(url),
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
          dispatch({
            type: RPCS,
            value: _rpcs,
          })
        }
      }
    }

    init()
  }, [chains_data])

  // sdk
  useEffect(() => {
    const init = async () => {
      if (
        chains_data &&
        assets_data?.findIndex(a => typeof a.price !== 'number') < 0
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
 
            const rpc_urls = (rpcUrls || [])
              .filter(url => url)

            if (domain_id) {
              chains_config[domain_id] = {
                providers: rpc_urls,
                assets: assets_data
                  .filter(a => a?.contracts?.findIndex(c => c?.chain_id === chain_id) > -1)
                  .map(a => {
                    const {
                      contracts,
                    } = { ...a }
                    let {
                      name,
                      symbol,
                    } = { ...a }

                    const contract_data = contracts.find(c => c?.chain_id === chain_id)
                    const {
                      contract_address,
                    } = { ...contract_data }

                    symbol = contract_data?.symbol ||
                      symbol

                    name = name ||
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

        dispatch({
          type: SDK,
          value: await create(
            sdkConfig,
          ),
        })
      }
    }

    init()
  }, [chains_data, assets_data])

  // sdk
  useEffect(() => {
    const update = async () => {
      if (
        sdk &&
        address
      ) {
        if (sdk.nxtpSdkBase) {
          await sdk.nxtpSdkBase.changeSignerAddress(
            address,
          )
        }

        if (sdk.nxtpSdkRouter) {
          await sdk.nxtpSdkRouter.changeSignerAddress(
            address,
          )
        }

        console.log(
          '[Signer address]',
          address,
        )

        dispatch({
          type: SDK,
          value: sdk,
        })
      }
    }

    update()
  }, [provider, web3_provider, address, signer])

  // assets balances
  useEffect(() => {
    const getData = async is_interval => {
      if (
        sdk &&
        chains_data &&
        assets_data &&
        assets_data.findIndex(a => typeof a.price !== 'number') < 0 &&
        ![
          '/tx/[tx]',
        ].includes(pathname) &&
        (
          !asset_balances_data ||
          is_interval
        )
      ) {
        const response = await sdk.nxtpSdkUtils.getRoutersData()

        if (
          response ||
          !is_interval
        ) {
          const data = _.groupBy(
            (response || [])
              .map(l => {
                const {
                  domain,
                  adopted,
                  balance,
                } = { ...l }

                const chain_data = chains_data?.find(c => c?.domain_id === domain)
                const {
                  chain_id,
                } = { ...chain_data }

                let asset_data = assets_data.find(a =>
                  a?.contracts?.findIndex(c =>
                    c?.chain_id === chain_id &&
                    equals_ignore_case(c?.contract_address, adopted)
                  ) > -1
                )
                asset_data = {
                  ...asset_data,
                  ...asset_data?.contracts?.find(c =>
                    c?.chain_id === chain_id &&
                    equals_ignore_case(c?.contract_address, adopted)
                  ),
                }
                if (asset_data?.contracts) {
                  delete asset_data.contracts
                }

                const {
                  decimals,
                  price,
                } = { ...asset_data }

                const amount = Number(
                  utils.formatUnits(
                    BigNumber.from(
                      BigInt(balance || 0).toString()
                    ),
                    decimals || 18,
                  )
                )

                const value = amount *
                  (price || 0)

                return {
                  ...l,
                  chain_id,
                  chain_data,
                  contract_address: adopted,
                  asset_data,
                  amount,
                  value,
                }
              }),
            'chain_id',
          )

          dispatch({
            type: ASSET_BALANCES_DATA,
            value: data,
          })
        }
      }
    }

    getData()

    const interval = setInterval(() =>
      getData(true),
      5 * 60 * 1000,
    )

    return () => clearInterval(interval)
  }, [sdk, chains_data, assets_data, pathname])

  // ens
  useEffect(() => {
    const getData = async () => {
      if (
        chains_data &&
        asset_balances_data &&
        chains_data.filter(c => !c?.disabled).length <= Object.keys(asset_balances_data).length
      ) {
        const addresses = _.uniq(
          Object.values(asset_balances_data)
            .flatMap(a => a)
            .map(a => a?.router_address)
            .filter(a => a && !ens_data?.[a])
        )

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
  }, [address])

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
            <Theme />
          </div>
        </div>
      </div>
      <SubNavbar />
    </>
  )
}