import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import BigNumber from 'bignumber.js'
import { BallTriangle } from 'react-loader-spinner'
import { TiArrowRight } from 'react-icons/ti'

import Image from '../image'
import { numberFormat } from '../../lib/utils'

BigNumber.config({ DECIMAL_PLACES: Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT), EXPONENTIAL_AT: [-7, Number(process.env.NEXT_PUBLIC_MAX_BIGNUMBER_EXPONENTIAL_AT)] })

export default function ChainGas({ chainId, className = '' }) {
  const { preferences, chains, rpcs } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, rpcs: state.rpcs }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { rpcs_data } = { ...rpcs }

  const router = useRouter()
  const { query } = { ...router }
  const { address } = { ...query }

  const [balance, setBalance] = useState(null)

  useEffect(() => {
    const getData = async () => {
      if (address && chainId && rpcs_data?.[chainId]) {
        setBalance(null)

        const decimals = chains_data?.find(c => c?.chain_id === chainId)?.provider_params?.[0]?.nativeCurrency?.decimals
        let _balance = await rpcs_data[chainId].getBalance(address)
        try {
          _balance = BigNumber(_balance.toString()).shiftedBy(-(decimals || 18)).toNumber()
        } catch (error) {}

        setBalance(_balance)
      }
    }

    getData()
  }, [address, chainId, rpcs_data])

  const chain = chains_data?.find(c => c?.chain_id === chainId)

  return (
    <div className={`${className}`}>
      <Image
        src={chain?.image}
        alt=""
        className="w-4 h-4 rounded-full"
      />
      <div className="h-5 flex items-center space-x-1">
        {typeof balance === 'number' ?
          <span className={`font-mono ${balance < Number(process.env.NEXT_PUBLIC_LOW_GAS_THRESHOLD) ? 'text-red-500' : ''} font-semibold`}>
            {numberFormat(balance, '0,0.000')}
          </span>
          :
          <BallTriangle color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
        }
        <span className="text-gray-400 dark:text-gray-600 font-medium">{chain?.provider_params?.[0]?.nativeCurrency?.symbol}</span>
        {chain?.explorer?.url && (
          <a
            href={`${chain.explorer.url}${chain.explorer.address_path?.replace('{address}', address)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="min-w-max text-blue-600 dark:text-white"
          >
            {chain.explorer.icon ?
              <Image
                src={chain.explorer.icon}
                alt=""
                className="w-3 h-3 rounded-full opacity-60 hover:opacity-100"
              />
              :
              <TiArrowRight size={14} className="transform -rotate-45" />
            }
          </a>
        )}
      </div>
    </div>
  )
}