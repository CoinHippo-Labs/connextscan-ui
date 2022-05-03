import Image from 'next/image'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import { BigNumber, utils } from 'ethers'
import { RotatingSquare } from 'react-loader-spinner'

import { number_format, loader_color } from '../../lib/utils'

export default ({ chainId, className = '' }) => {
  const { preferences, chains, rpc_providers } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, rpc_providers: state.rpc_providers }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { rpcs } = { ...rpc_providers }

  const router = useRouter()
  const { query } = { ...router }
  const { address } = { ...query }

  const [balance, setBalance] = useState(null)

  useEffect(() => {
    const getData = async is_interval => {
      if (address && rpcs?.[chainId]) {
        if (!is_interval) {
          setBalance(null)
        }
        const rpc = rpcs[chainId]
        const decimals = chains_data?.find(c => c?.chain_id === chainId)?.provider_params?.[0]?.nativeCurrency?.decimals || 18
        try {
          const balance = Number(utils.formatUnits(BigNumber.from((await rpc.getBalance(address)).toString()), decimals))
          setBalance(balance)
        } catch (error) {
          if (!balance) {
            setBalance('')
          }
        }
      }
    }
    getData()
    const interval = setInterval(() => getData(true), 1 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [address, chainId, rpcs])

  const chain_data = chains_data?.find(c => c?.chain_id === chainId)
  const image = chain_data && (
    <Image
      src={chain_data.image}
      alt=""
      width={20}
      height={20}
      className="rounded-full"
    />
  )
  const children = (
    <div className="h-4 flex items-center text-xs space-x-1">
      {typeof balance === 'number' ?
        <>
          <span className={`${balance < Number(process.env.NEXT_PUBLIC_LOW_GAS_THRESHOLD) ? 'text-red-500' : ''} font-semibold`}>
            {number_format(balance, '0,0.000')}
          </span>
          <span className="font-medium">
            {chain_data?.provider_params?.[0]?.nativeCurrency?.symbol}
          </span>
        </>
        :
        typeof balance === 'string' ?
          <span>-</span>
          :
          <RotatingSquare color={loader_color(theme)} width="16" height="16" />
      }
    </div>
  )
  const hasLink = !!chain_data?.explorer?.url
  className = `hover:bg-slate-200 dark:hover:bg-slate-800 flex flex-col items-center justify-center space-y-1 pt-2 pb-1 px-3 ${className}`

  return (
    hasLink ?
      <a
        href={`${chain_data.explorer.url}${chain_data.explorer.address_path?.replace('{address}', address)}`}
        target="_blank"
        rel="noopener noreferrer"
        className={className}
      >
        {image}
        {children}
      </a>
      :
      <div className={className}>
        {image}
        {children}
      </div>
  )
}