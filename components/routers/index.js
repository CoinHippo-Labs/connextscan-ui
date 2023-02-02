import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import moment from 'moment'
import Web3 from 'web3'
import { constants, utils } from 'ethers'
import { Triangle } from 'react-loader-spinner'
import StackGrid from 'react-stack-grid'
import { MdOutlineRouter } from 'react-icons/md'
import { TiArrowRight } from 'react-icons/ti'

import Popover from '../popover'
import Copy from '../copy'
import Widget from '../widget'
import Image from '../image'
import { currency_symbol } from '../../lib/object/currency'
import { numberFormat, ellipseAddress } from '../../lib/utils'

export default function Routers() {
  const { preferences, chains, ens, routers_assets } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, ens: state.ens, routers_assets: state.routers_assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { ens_data } = { ...ens }
  const { routers_assets_data } = { ...routers_assets }

  const router = useRouter()
  const { query } = { ...router }
  const { all } = { ...query }

  const [routers, setRouters] = useState(null)
  const [web3, setWeb3] = useState(null)
  const [chainId, setChainId] = useState(null)
  const [addTokenData, setAddTokenData] = useState(null)
  const [timer, setTimer] = useState(null)

  useEffect(() => {
    if (!web3) {
      setWeb3(new Web3(Web3.givenProvider))
    }
    else {
      try {
        web3.currentProvider._handleChainChanged = e => {
          try {
            setChainId(Web3.utils.hexToNumber(e?.chainId))
          } catch (error) {}
        }
      } catch (error) {}
    }
  }, [web3])

  useEffect(() => {
    if (addTokenData?.chain_id === chainId && addTokenData?.contract) {
      addTokenToMetaMask(addTokenData.chain_id, addTokenData.contract)
    }
  }, [chainId, addTokenData])

  useEffect(() => {
    if (routers_assets_data) {
      const data = routers_assets_data.map(ra => {
        const assetBalances = ra?.asset_balances || []

        return {
          ...ra,
          amount_value: _.sumBy(assetBalances, 'amount_value'),
          locked_value: _.sumBy(assetBalances, 'locked_value'),
          lockedIn_value: _.sumBy(assetBalances, 'lockedIn_value'),
          supplied_value: _.sumBy(assetBalances, 'supplied_value'),
          removed_value: _.sumBy(assetBalances, 'removed_value'),
          volume_value: _.sumBy(assetBalances, 'volume_value'),
          volumeIn_value: _.sumBy(assetBalances, 'volumeIn_value'),
          receivingFulfillTxCount: _.sumBy(assetBalances, 'receivingFulfillTxCount'),
        }
      }).filter(ra => ['true'].includes(all) || ra?.amount_value > 1)

      setRouters(_.orderBy(data, ['amount_value'], ['desc']))
    }
  }, [routers_assets_data])

  useEffect(() => {
    const run = async () => setTimer(moment().unix())
    if (!timer) {
      run()
    }
    const interval = setInterval(() => run(), 0.5 * 1000)
    return () => clearInterval(interval)
  }, [timer])

  const addTokenToMetaMask = async (chain_id, contract) => {
    if (web3 && contract) {
      if (chain_id === chainId) {
        try {
          const response = await web3.currentProvider.request({
            method: 'wallet_watchAsset',
            params: {
              type: 'ERC20',
              options: {
                address: contract.contract_address,
                symbol: contract.symbol,
                decimals: contract.contract_decimals,
                image: `${contract.image?.startsWith('/') ? process.env.NEXT_PUBLIC_SITE_URL : ''}${contract.image}`,
              },
            },
          })
        } catch (error) {}

        setAddTokenData(null)
      }
      else {
        switchNetwork(chain_id, contract)
      }
    }
  }

  const switchNetwork = async (chain_id, contract) => {
    try {
      await web3.currentProvider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: utils.hexValue(chain_id) }],
      })
    } catch (error) {
      if (error.code === 4902) {
        try {
          await web3.currentProvider.request({
            method: 'wallet_addEthereumChain',
            params: chains_data?.find(c => c.chain_id === chain_id)?.provider_params,
          })
        } catch (error) {}
      }
    }

    if (contract) {
      setAddTokenData({ chain_id, contract })
    }
  }

  const routersComponent = routers?.map((r, i) => (
    <Widget
      key={i}
      title={<div className={`flex items-${ens_data?.[r?.router_id.toLowerCase()]?.name ? 'start' : 'center'} space-x-1.5`}>
        <MdOutlineRouter size={20} className="text-gray-400 dark:text-gray-600 mb-0.5" />
        {r?.router_id && (
          <div className="space-y-0.5">
            {ens_data?.[r.router_id.toLowerCase()]?.name && (
              <div className="flex items-center">
                <Image
                  src={`${process.env.NEXT_PUBLIC_ENS_AVATAR_URL}/${ens_data[r.router_id.toLowerCase()].name}`}
                  alt=""
                  className="w-6 h-6 rounded-full mr-2"
                />
                <Link href={`/router/${r.router_id}`}>
                  <a className="text-blue-600 dark:text-white sm:text-base font-semibold">
                    {ellipseAddress(ens_data[r.router_id.toLowerCase()].name, 16)}
                  </a>
                </Link>
              </div>
            )}
            <div className="flex items-center space-x-1">
              {ens_data?.[r.router_id.toLowerCase()]?.name ?
                <Copy
                  text={r.router_id}
                  copyTitle={<span className="text-gray-400 dark:text-gray-600 text-xs font-normal">
                    {ellipseAddress(r.router_id, 8)}
                  </span>}
                />
                :
                <>
                  <Link href={`/router/${r.router_id}`}>
                    <a className="text-blue-600 dark:text-white text-xs font-normal">
                      {ellipseAddress(r.router_id, 8)}
                    </a>
                  </Link>
                  <Copy text={r.router_id} />
                </>
              }
            </div>
          </div>
        )}
      </div>}
      right={r?.amount_value > 0 && (
        <div className="block sm:flex items-center ml-2">
          <div className="flex flex-col justify-end space-y-1 mr-0 sm:mr-6">
            <div className="uppercase text-gray-400 dark:text-gray-600 text-2xs font-medium text-right">Available</div>
            <div className="font-mono uppercase sm:text-sm font-semibold text-right">
              {currency_symbol}{numberFormat(r.amount_value, '0,0.00a')}
            </div>
          </div>
          <div className="hidden sm:flex flex-col justify-end space-y-1 mt-2 sm:mt-0 ">
            <div className="uppercase text-gray-400 dark:text-gray-600 text-2xs font-medium text-right">Total</div>
            <div className="font-mono uppercase sm:text-sm font-semibold text-right">
              {currency_symbol}{numberFormat(r.amount_value + (r.locked_value || 0) + (r.lockedIn_value || 0), '0,0.00a')}
            </div>
          </div>
        </div>
      )}
      className="border-0 shadow-md rounded-2xl"
    >
      <div className="grid grid-flow-row grid-cols-2 sm:grid-cols-3 gap-0 mt-4 mb-2">
        {_.orderBy(r?.asset_balances?.flatMap(abs => abs) || [], ['amount_value', 'amount'], ['desc', 'desc']).map((ab, j) => {
          const addToMetaMaskButton = ab?.assetId !== constants.AddressZero && (
            <button
              onClick={() => addTokenToMetaMask(ab?.chain?.chain_id, { ...ab?.asset })}
              className="w-auto bg-gray-100 hover:bg-gray-200 dark:bg-gray-800 dark:hover:bg-gray-700 rounded flex items-center justify-center py-1 px-1.5"
            >
              <Image
                src="/logos/wallets/metamask.png"
                alt=""
                className="w-3 h-3"
              />
            </button>
          )

          return (
            <div key={j}>
              {ab?.asset ?
                <div className="min-h-full border pt-2.5 pb-3 px-2" style={{ borderColor: ab?.chain?.color }}>
                  <div className="space-y-0.5">
                    <div className="flex items-start">
                      <Image
                        src={ab.asset?.image}
                        alt=""
                        className="w-4 h-4 rounded-full mr-1"
                      />
                      <div className="flex flex-col">
                        <span className="leading-4 text-2xs font-semibold">{ab.asset.name}</span>
                        {ab.assetId && (
                          <span className="min-w-max flex items-center space-x-0.5">
                            <Copy
                              size={14}
                              text={ab.assetId}
                              copyTitle={<span className="text-gray-400 dark:text-gray-600 text-3xs font-medium">
                                {ellipseAddress(ab.assetId, 4)}
                              </span>}
                            />
                            {ab?.chain?.explorer?.url && (
                              <a
                                href={`${ab.chain.explorer.url}${ab.chain.explorer[`contract${ab.assetId === constants.AddressZero ? '_0' : ''}_path`]?.replace('{address}', ab.assetId)}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 dark:text-white"
                              >
                                {ab.chain.explorer.icon ?
                                  <Image
                                    src={ab.chain.explorer.icon}
                                    alt=""
                                    className="w-3.5 h-3.5 rounded-full opacity-60 hover:opacity-100"
                                  />
                                  :
                                  <TiArrowRight size={16} className="transform -rotate-45" />
                                }
                              </a>
                            )}
                          </span>
                        )}
                      </div>
                      {ab?.chain?.image && (
                        <Link href={`/${ab.chain.id}`}>
                          <a className="hidden sm:block min-w-max w-3 h-3 relative -top-1 -right-1 ml-auto">
                            <Image
                              src={ab.chain.image}
                              alt=""
                              className="w-3 h-3 rounded-full"
                            />
                          </a>
                        </Link>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center justify-center mt-1.5">
                    <div className="w-full text-center space-y-1">
                      <div className="font-mono text-xs">
                        {typeof ab?.amount === 'number' ?
                          <>
                            <span className={`uppercase ${ab?.amount_value > 100000 ? 'font-semibold' : 'text-gray-700 dark:text-gray-300 font-medium'} mr-1.5`}>
                              {numberFormat(ab.amount, ab.amount > 10000 ? '0,0.00a' : ab.amount > 10 ? '0,0' : '0,0.000')}
                            </span>
                            <span className="text-gray-400 dark:text-gray-600 text-3xs font-medium">{ab?.asset?.symbol}</span>
                          </>
                          :
                          <span className="text-gray-400 dark:text-gray-600">n/a</span>
                        }
                      </div>
                      <div className="max-w-min bg-gray-100 dark:bg-gray-800 rounded-lg font-mono text-3xs mx-auto py-1 px-2">
                        {typeof ab?.amount_value === 'number' ?
                          <span className={`uppercase ${ab?.amount_value > 100000 ? 'text-gray-800 dark:text-gray-200 font-semibold' : 'text-gray-600 dark:text-gray-400'}`}>
                            {currency_symbol}{numberFormat(ab.amount_value, ab.amount_value > 100000 ? '0,0.00a' : ab.amount_value > 1000 ? '0,0' : '0,0.000')}
                          </span>
                          :
                          <span className="text-gray-400 dark:text-gray-600">n/a</span>
                        }
                      </div>
                    </div>
                    <div className="min-w-max relative -bottom-2.5 -right-2 mb-0.5 ml-auto">
                      <Popover
                        placement="left"
                        title={<span className="normal-case text-3xs">Add token</span>}
                        content={<div className="w-32 text-3xs">Add <span className="font-semibold">{ab.asset.symbol}</span> to MetaMask</div>}
                        titleClassName="py-0.5"
                        contentClassName="py-1.5"
                      >
                        {addToMetaMaskButton}
                      </Popover>
                    </div>
                  </div>
                </div>
                :
                <div className="w-full h-24 shadow flex items-center justify-center">
                  <Triangle color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
                </div>
              }
            </div>
          )
        })}
      </div>
    </Widget>
  ))

  return (
    <>
      <StackGrid
        columnWidth={444}
        gutterWidth={16}
        gutterHeight={16}
        className="hidden sm:block"
      >
        {routersComponent}
      </StackGrid>
      <div className="block sm:hidden space-y-3">
        {routersComponent}
      </div>
    </>
  )
}