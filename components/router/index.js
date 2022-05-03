import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Gases from '../gases'
// import Assets from '../../components/assets'
// import Transactions from '../../components/transactions'
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
    <>
      <div>
        {/*<Assets assetBy="routers" addTokenToMetaMaskFunction={addTokenToMetaMask} />
        <div>
          <Transactions addTokenToMetaMaskFunction={addTokenToMetaMask} className="no-border" />
        </div>*/}
      </div>
      <Gases />
    </>
  )
}