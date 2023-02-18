import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { utils } from 'ethers'

import Metrics from '../metrics'
import RouterLiquidity from '../router-liquidity'
import Assets from '../assets'
import Transfers from '../transfers'
import { daily_transfer_metrics, daily_transfer_volume } from '../../lib/api/metrics'
import { type } from '../../lib/object/id'
import { getChain } from '../../lib/object/chain'
import { getAsset } from '../../lib/object/asset'
import { getContract } from '../../lib/object/contract'
import { toArray, equalsIgnoreCase } from '../../lib/utils'

export default () => {
  const {
    preferences,
    chains,
    assets,
    ens,
    dev,
  } = useSelector(
    state => (
      {
        preferences: state.preferences,
        chains: state.chains,
        assets: state.assets,
        ens: state.ens,
        dev: state.dev,
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
    ens_data,
  } = { ...ens }
  const {
    sdk,
  } = { ...dev }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    address,
    action,
  } = { ...query }

  const [liquidity, setLiquidity] = useState(null)
  const [data, setData] = useState(null)

  useEffect(
    () => {
      let _address = address

      if (
        type(_address) === 'ens' &&
        Object.values({ ...ens_data })
          .findIndex(d =>
            equalsIgnoreCase(
              d?.name,
              _address,
            )
          ) > -1
      ) {
        _address =
          _.head(
            Object.entries(ens_data)
              .find(([k, v]) =>
                equalsIgnoreCase(
                  v?.name,
                  _address,
                )
              )
          )

        router.push(`/router/${_address}`)
      }
    },
    [address, ens_data],
  )

  useEffect(
    () => {
      const getData = async is_interval => {
        if (page_visible && sdk && chains_data && assets_data) {
          const response = toArray(await sdk.sdkUtils.getRoutersData())

          const data =
            response
              .filter(d =>
                equalsIgnoreCase(
                  d?.address,
                  address,
                ) &&
                getChain(d?.domain, chains_data)
              )
              .map(d => {
                const {
                  domain,
                  local,
                  balance,
                } = { ...d }

                const chain_data = getChain(domain, chains_data)

                const {
                  chain_id,
                } = { ...chain_data }

                let asset_data = getAsset(null, assets_data, chain_id, local)

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

                const amount = Number(utils.formatUnits(BigInt(balance || '0'), decimals || 18))

                return {
                  ...d,
                  chain_id,
                  contract_address: local,
                  amount,
                  value: amount * (price || 0),
                }
              })

          setLiquidity(data)

          if (['refresh'].includes(action)) {
            router.push(`/router/${address}`)
          }
        }
      }

      getData()

      const interval =
        setInterval(
          () => getData(),
          0.5 * 60 * 1000,
        )

      return () => clearInterval(interval)
    },
    [page_visible, address, sdk, chains_data, assets_data, action],
  )

  useEffect(
    () => {
      const getData = async () => {
        if (sdk && chains_data && assets_data) {
          const volumes =
            toArray(await daily_transfer_volume({ router: `eq.${address}` }))
              .filter(v => v.transfer_date)
              .map(v => {
                const {
                  origin_chain,
                  destination_chain,
                  asset,
                  volume,
                } = { ...v }

                const origin_chain_data = getChain(origin_chain, chains_data)
                const destination_chain_data = getChain(destination_chain, chains_data)

                let asset_data = getAsset(null, assets_data, origin_chain_data?.chain_id, asset)

                asset_data = {
                  ...asset_data,
                  ...getContract(origin_chain_data?.chain_id, asset_data?.contracts),
                }

                if (asset_data.contracts) {
                  delete asset_data.contracts
                }

                if (asset_data.next_asset && equalsIgnoreCase(asset_data.next_asset.contract_address, asset)) {
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

                const amount = Number(utils.formatUnits(BigInt(volume || '0'), decimals || 18))

                return {
                  ...v,
                  origin_chain_data,
                  destination_chain_data,
                  asset_data,
                  amount,
                  volume: amount * (price || 0),
                }
              })

          const transfers =
            toArray(await daily_transfer_metrics({ router: `eq.${address}` }))
              .filter(t => t.transfer_date)
              .map(t => {
                const {
                  origin_chain,
                  destination_chain,
                } = { ...t }

                const origin_chain_data = getChain(origin_chain, chains_data)
                const destination_chain_data = getChain(destination_chain, chains_data)

                return {
                  ...t,
                  origin_chain_data,
                  destination_chain_data,
                }
              })

          setData(
            {
              total_volume: _.sumBy(volumes, 'volume'),
              total_transfers: _.sumBy(transfers, 'transfer_count'),
            },
          )
        }
      }

      getData()
    },
    [sdk, chains_data, assets_data],
  )

  const {
    total_volume,
    total_transfers,
  } = { ...data }

  const metrics =
    liquidity && data &&
    {
      liquidity: _.sumBy(liquidity, 'value'),
      volume: total_volume,
      transfers: total_transfers,
      // fee: 33.33,
      supported_chains: _.uniq(liquidity.map(d => d?.chain_id)),
    }

  return (
    <>
      <div className="flex flex-col items-start space-y-4 mb-6">
        <Metrics
          data={metrics}
        />
        <RouterLiquidity />
      </div>
      <div className="flex items-start justify-between space-x-2">
        <div className="w-full grid grid-flow-row xl:grid-cols-2 gap-6 mb-4">
          <Assets
            data={liquidity}
          />
          <Transfers />
        </div>
      </div>
    </>
  )
}