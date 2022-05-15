import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import AddRouterLiquidity from '../add-router-liquidity'
import Assets from '../assets'
import Transactions from '../transactions'
import { type } from '../../lib/object/id'
import { equals_ignore_case } from '../../lib/utils'

export default () => {
  const { chains, ens, dev } = useSelector(state => ({ chains: state.chains, ens: state.ens, dev: state.dev }), shallowEqual)
  const { chains_data} = { ...chains }
  const { ens_data } = { ...ens }
  const { sdk } = { ...dev }

  const router = useRouter()
  const { query } = { ...router }
  const { address, action } = { ...query }

  const [liquidity, setLiquidity] = useState(null)

  useEffect(() => {
    let _address = address
    if (type(_address) === 'ens') {
      if (Object.values({ ...ens_data }).findIndex(d => equals_ignore_case(d?.name, _address)) > -1) {
        _address = Object.entries(ens_data).find(([k, v]) => equals_ignore_case(v?.name, _address))[0]
        router.push(`/router/${_address}`)
      }
    }
    else if (chains_data && sdk) {
      const getData = async is_interval => {
        const response = await sdk.nxtpSdkUtils.getRoutersData()
        if (response || !is_interval) {
          const data = response?.filter(l => equals_ignore_case(l?.router_address, address)).map(l => {
            const chain_data = chains_data?.find(c => c?.domain_id?.toString() === l?.domain)
            return {
              ...l,
              chain_id: chain_data?.chain_id,
              contract_address: l?.adopted,
              amount: BigInt(Number(l?.balance) || 0).toString(),
            }
          }) || []
          setLiquidity(data)
        }
        if (['refresh'].includes(action)) {
          router.push(`/router/${_address}`)
        }
      }
      getData()
      const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
      return () => {
        clearInterval(interval)
      }
    }
  }, [address, chains_data, ens_data, sdk, action])

  return (
    <>
      <AddRouterLiquidity />
      <div className="flex items-start justify-between space-x-2">
        <div className="w-full grid grid-flow-row lg:grid-cols-2 gap-4 lg:gap-6 mb-4">
          <Assets data={liquidity} />
          <Transactions />
        </div>
      </div>
    </>
  )
}