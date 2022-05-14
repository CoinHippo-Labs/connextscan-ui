import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import Assets from '../assets'
import { equals_ignore_case } from '../../lib/utils'

export default () => {
  const { chains, dev } = useSelector(state => ({ chains: state.chains, dev: state.dev }), shallowEqual)
  const { chains_data} = { ...chains }
  const { sdk } = { ...dev }

  const router = useRouter()
  const { query } = { ...router }
  const { chain } = { ...query }

  const [liquidity, setLiquidity] = useState(null)

  useEffect(() => {
    if (chain && chains_data && sdk) {
      const getData = async is_interval => {
        const response = await sdk.nxtpSdkUtils.getRoutersData()
        if (response || !is_interval) {
          const chain_data = chains_data?.find(c => c?.id === chain)
          const data = response?.filter(l => l?.domain === chain_data?.domain_id?.toString()).map(l => {
            return {
              ...l,
              chain_id: chain_data?.chain_id,
              contract_address: l?.adopted,
              amount: BigInt(Number(l?.balance) || 0).toString(),
            }
          }) || []
          setLiquidity(data)
        }
      }
      getData()
      const interval = setInterval(() => getData(), 0.5 * 60 * 1000)
      return () => {
        clearInterval(interval)
      }
    }
  }, [chain, chains_data, sdk])

  return (
    <div className="flex items-start justify-between space-x-2">
      <div className="w-full grid grid-flow-row lg:grid-cols-2 gap-4 mb-4">
        <Assets data={liquidity} />
      </div>
    </div>
  )
}