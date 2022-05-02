import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { Img } from 'react-image'
import { ThreeDots, Puff } from 'react-loader-spinner'
import { HiStatusOnline } from 'react-icons/hi'
import { AiOutlineNumber } from 'react-icons/ai'
import { BiGasPump } from 'react-icons/bi'

import ChainGas from '../../components/chain-gas'
import Assets from '../../components/assets'
import Transactions from '../../components/transactions'
import Widget from '../../components/widget'
import { type } from '../../lib/object/id'
import { currency_symbol } from '../../lib/object/currency'
import { number_format } from '../../lib/utils'

export default () => {
  const { preferences, chains, ens, routers_status, routers_assets } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, ens: state.ens, routers_status: state.routers_status, routers_assets: state.routers_assets }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { ens_data } = { ...ens }
  const { routers_status_data } = { ...routers_status }
  const { routers_assets_data } = { ...routers_assets }

  const router = useRouter()
  const { query } = { ...router }
  const { address } = { ...query }

  useEffect(() => {
    let _address = address
    if (type(_address) === 'ens' && Object.values({ ...ens_data }).findIndex(d => d?.name?.toLowerCase() === _address?.toLowerCase()) > -1) {
      _address = Object.entries(ens_data).find(([k, v]) => v?.name?.toLowerCase() === _address?.toLowerCase())[0]
      router.push(`/router/${_address}`)
    }
  }, [address, ens_data])

  const routerStatus = routers_status_data?.find(r => r?.routerAddress?.toLowerCase() === address?.toLowerCase())
  const routerAssets = routers_assets_data?.find(ra => ra?.router_id?.toLowerCase() === address?.toLowerCase())

  return (
    <div className="space-y-8 my-2 xl:mt-4 xl:mb-6 mx-auto">
      <div className="grid grid-flow-row grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-6 mt-8 mx-3 sm:mx-2">
        <Widget
          title={<div className="flex items-center text-black dark:text-white space-x-2.5">
            <HiStatusOnline size={20} />
            <span className="uppercase text-base font-semibold">Status</span>
          </div>}
          className="overflow-y-auto border-0 shadow-md rounded-2xl p-4"
        >
          <div className="flex flex-col space-y-3.5 mt-2.5">
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Version</span>
              {routers_status_data ?
                routerStatus?.routerVersion ?
                  <span className="font-mono font-semibold">{routerStatus.routerVersion}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <ThreeDots color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Active TXs</span>
              {routers_status_data ?
                typeof routerStatus?.activeTransactionsLength === 'number' ?
                  <span className="font-mono font-semibold">{number_format(routerStatus.activeTransactionsLength, '0,0')}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <ThreeDots color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Processing TXs</span>
              {routers_status_data ?
                typeof routerStatus?.trackerLength === 'number' ?
                  <span className="font-mono font-semibold">{number_format(routerStatus.trackerLength, '0,0')}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <ThreeDots color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
          </div>
        </Widget>
        <Widget
          title={<div className="flex items-center text-black dark:text-white space-x-2">
            <AiOutlineNumber size={20} />
            <span className="uppercase text-base font-semibold">Statistics</span>
          </div>}
          className="col-span-1 lg:col-span-2 border-0 shadow-md rounded-2xl p-4"
        >
          <div className="overflow-y-auto grid grid-flow-row grid-cols-1 lg:grid-cols-2 gap-y-3.5 gap-x-6 mt-2.5" style={{ maxHeight: '122px' }}>
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Volume</span>
              {routerAssets ?
                routerAssets.asset_balances ?
                  <span className="break-all font-mono font-semibold text-right">{currency_symbol}{number_format(_.sumBy(routerAssets.asset_balances, 'volume_value'), '0,0')}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <Puff color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Transactions</span>
              {routerAssets ?
                routerAssets.asset_balances ?
                  <span className="font-mono font-semibold">{number_format(_.sumBy(routerAssets.asset_balances, 'receivingFulfillTxCount'), '0,0')}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <Puff color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Liquidity</span>
              {routerAssets ?
                routerAssets.asset_balances ?
                  <span className="break-all font-mono font-semibold text-right">{currency_symbol}{number_format(_.sumBy(routerAssets.asset_balances, 'amount_value'), '0,0')}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <Puff color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Total</span>
              {routerAssets ?
                routerAssets.asset_balances ?
                  <span className="break-all font-mono font-semibold text-right">{currency_symbol}{number_format(_.sumBy(routerAssets.asset_balances, 'amount_value') + _.sumBy(routerAssets.asset_balances, 'locked_value') + _.sumBy(routerAssets.asset_balances, 'lockedIn_value'), '0,0')}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <Puff color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Locked</span>
              {routerAssets ?
                routerAssets.asset_balances ?
                  <span className="break-all font-mono font-semibold text-right">{currency_symbol}{number_format(_.sumBy(routerAssets.asset_balances, 'locked_value'), '0,0')}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <Puff color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Locked In</span>
              {routerAssets ?
                routerAssets.asset_balances ?
                  <span className="break-all font-mono font-semibold text-right">{currency_symbol}{number_format(_.sumBy(routerAssets.asset_balances, 'lockedIn_value'), '0,0')}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <Puff color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Supplied</span>
              {routerAssets ?
                routerAssets.asset_balances ?
                  <span className="break-all font-mono font-semibold text-right">{currency_symbol}{number_format(_.sumBy(routerAssets.asset_balances, 'supplied_value'), '0,0')}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <Puff color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
            <div className="flex items-center justify-between text-base sm:text-sm space-x-2">
              <span className="text-gray-400 dark:text-gray-600 font-medium">Removed</span>
              {routerAssets ?
                routerAssets.asset_balances ?
                  <span className="break-all font-mono font-semibold text-right">{currency_symbol}{number_format(_.sumBy(routerAssets.asset_balances, 'removed_value'), '0,0')}</span>
                  :
                  <span className="text-gray-400 dark:text-gray-600">n/a</span>
                :
                <Puff color={theme === 'dark' ? 'white' : '#3B82F6'} width="16" height="16" />
              }
            </div>
          </div>
        </Widget>
        <Widget
          title={<div className="flex items-center text-black dark:text-white space-x-2">
            <BiGasPump size={20} />
            <span className="uppercase text-base font-semibold">Available Gas</span>
          </div>}
          className="col-span-1 lg:col-span-2 border-0 shadow-md rounded-2xl p-4"
        >
          <div className="overflow-y-auto grid grid-flow-row grid-cols-2 lg:grid-cols-3 gap-y-3.5 gap-x-6 mt-2.5" style={{ maxHeight: '122px' }}>
            {chains_data?.filter(c => !c.disabled && (!routerStatus?.supportedChains || routerStatus.supportedChains.includes(c?.chain_id))).map((c, i) => (
              <ChainGas
                key={i}
                chainId={c.chain_id}
                className="flex items-center text-xs space-x-1.5"
              />
            ))}
          </div>
        </Widget>
      </div>
      {/*<Assets assetBy="routers" addTokenToMetaMaskFunction={addTokenToMetaMask} />
      <div>
        <Transactions addTokenToMetaMaskFunction={addTokenToMetaMask} className="no-border" />
      </div>*/}
    </div>
  )
}