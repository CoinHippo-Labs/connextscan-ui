import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Gases from '../gases'
import Assets from '../assets'
import { type } from '../../lib/object/id'

export default () => {
  const { ens, dev } = useSelector(state => ({ ens: state.ens, dev: state.dev }), shallowEqual)
  const { ens_data } = { ...ens }
  const { sdk } = { ...dev }

  const router = useRouter()
  const { query } = { ...router }
  const { address } = { ...query }

  const [liquidity, setLiquidity] = useState(null)

  useEffect(() => {
    let _address = address
    if (type(_address) === 'ens') {
      if (Object.values({ ...ens_data }).findIndex(d => d?.name?.toLowerCase() === _address?.toLowerCase()) > -1) {
        _address = Object.entries(ens_data).find(([k, v]) => v?.name?.toLowerCase() === _address?.toLowerCase())[0]
        router.push(`/router/${_address}`)
      }
    }
    else if (sdk) {

    }
  }, [address, ens_data, sdk])

  return (
    <div className="flex items-start justify-between space-x-2 -mr-1.5 sm:-mr-3.5">
      <div className="w-full grid grid-flow-row lg:grid-cols-2 gap-4 mb-4">
        <Assets data={liquidity} />
      </div>
      <Gases />
    </div>
  )
}