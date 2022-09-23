import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { BigNumber, utils } from 'ethers'

import Metrics from '../metrics'
import AddRouterLiquidity from '../add-router-liquidity'
import Assets from '../assets'
import Transfers from '../transfers'
import { daily_transfer_metrics, daily_transfer_volume } from '../../lib/api/metrics'
import { type } from '../../lib/object/id'
import { equals_ignore_case } from '../../lib/utils'

export default () => {
  const { chains, assets, ens, dev } = useSelector(state => ({ chains: state.chains, assets: state.assets, ens: state.ens, dev: state.dev }), shallowEqual)
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { ens_data } = { ...ens }
  const { sdk } = { ...dev }

  const router = useRouter()
  const { query } = { ...router }
  const { address, action } = { ...query }

  const [liquidity, setLiquidity] = useState(null)
  const [data, setData] = useState(null)

  useEffect(() => {
    let _address = address

    if (
      type(_address) === 'ens' &&
      Object.values({ ...ens_data })
        .findIndex(d => equals_ignore_case(d?.name, _address)) > -1
    ) {
      _address = _.head(
        Object.entries(ens_data)
          .find(([k, v]) => equals_ignore_case(v?.name, _address))
      )

      router.push(`/router/${_address}`)
    }
  }, [address, ens_data])

  useEffect(() => {
    const getData = async is_interval => {
      if (sdk && chains_data && assets_data) {
        const response = await sdk.nxtpSdkUtils.getRoutersData()

        if (
          response ||
          !is_interval
        ) {
          const data = (response || [])
            .filter(l =>
              equals_ignore_case(l?.router_address, address) &&
              chains_data.findIndex(c => c?.domain_id === l?.domain) > -1
            )
            .map(l => {
              const {
                domain,
                local,
                balance,
              } = { ...l }

              const chain_data = chains_data.find(c => c?.domain_id === domain)
              const {
                chain_id,
              } = { ...chain_data }

              let asset_data = assets_data.find(a => a?.contracts?.findIndex(c =>
                c?.chain_id === chain_id &&
                equals_ignore_case(c?.contract_address, local)
              ) > -1)
              asset_data = {
                ...asset_data,
                ...asset_data?.contracts?.find(c =>
                  c?.chain_id === chain_id &&
                  equals_ignore_case(c?.contract_address, local)
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

              return {
                ...l,
                chain_id,
                contract_address: local,
                amount,
                value: amount * (price || 0),
              }
            })

          setLiquidity(data)
        }

        if (['refresh'].includes(action)) {
          router.push(`/router/${address}`)
        }
      }
    }

    getData()

    return () => clearInterval(
      setInterval(() =>
        getData(true),
        0.5 * 60 * 1000,
      )
    )
  }, [address, sdk, chains_data, assets_data, action])

  useEffect(() => {
    const getData = async () => {
      if (sdk && chains_data && assets_data) {
        let volumes = await daily_transfer_volume({
          router: `eq.${address}`,
        })

        volumes = (volumes || [])
          .map(v => {
            const {
              transfer_date,
              origin_chain,
              destination_chain,
              asset,
              volume,
            } = { ...v }

            const origin_chain_data = chains_data.find(c => c?.domain_id === origin_chain)
            const destination_chain_data = chains_data.find(c => c?.domain_id === destination_chain)
            let asset_data = assets_data.find(a => a?.contracts?.findIndex(c => c?.chain_id === origin_chain_data?.chain_id && equals_ignore_case(c?.contract_address, asset)) > -1)
            asset_data = {
              ...asset_data,
              ...asset_data?.contracts?.find(c => c?.chain_id === origin_chain_data?.chain_id && equals_ignore_case(c?.contract_address, asset)),
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
                  BigInt(volume || 0).toString()
                ),
                decimals || 18,
              )
            )

            return {
              ...v,
              origin_chain_data,
              destination_chain_data,
              asset_data,
              amount,
              volume: amount * (price || 0),
            }
          })

        let transfers = await daily_transfer_metrics({
          router: `eq.${address}`,
        })

        transfers = (transfers || [])
          .map(t => {
            const {
              transfer_date,
              origin_chain,
              destination_chain,
            } = { ...t }

            const origin_chain_data = chains_data.find(c => c?.domain_id === origin_chain)
            const destination_chain_data = chains_data.find(c => c?.domain_id === destination_chain)

            return {
              ...t,
              origin_chain_data,
              destination_chain_data,
            }
          })

        setData({
          total_volume: _.sumBy(
            volumes,
            'volume',
          ),
          total_transfers: _.sumBy(
            transfers,
            'transfer_count',
          ),
        })
      }
    }

    getData()
  }, [sdk, chains_data, assets_data])

  const {
    total_volume,
    total_transfers,
  } = { ...data }

  const metrics = liquidity &&
    {
      liquidity: _.sumBy(
        liquidity,
        'value',
      ),
      volume: total_volume,
      transfers: total_transfers,
      // fee: 33.33,
      supported_chains: _.uniq(
        liquidity.map(d => d?.chain_id)
      ),
    }

  return (
    <>
      <div className="flex flex-col sm:flex-row items-start justify-between space-y-4 sm:space-y-0 sm:space-x-8 mb-6">
        <AddRouterLiquidity />
        <Metrics
          data={metrics}
        />
      </div>
      <div className="flex items-start justify-between space-x-2">
        <div className="w-full grid grid-flow-row lg:grid-cols-2 gap-6 mb-4">
          <Assets
            data={liquidity}
          />
          <Transfers />
        </div>
      </div>
    </>
  )
}