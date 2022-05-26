import Link from 'next/link'
import { useRouter } from 'next/router'
import { useState, useEffect } from 'react'
import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'
import moment from 'moment'
import { BigNumber, utils } from 'ethers'
import { XTransferStatus } from '@connext/nxtp-utils'
import { TailSpin, ThreeCircles, RotatingSquare } from 'react-loader-spinner'
import Pulse from 'react-reveal/Pulse'
import { VscPassFilled } from 'react-icons/vsc'

import Image from '../image'
import SelectChain from '../select/chain'
import SelectAsset from '../select/asset'
import SelectStatus from '../select/status'
import Datatable from '../datatable'
import EnsProfile from '../ens-profile'
import AddToken from '../add-token'
import Copy from '../copy'
import { number_format, ellipse, equals_ignore_case, total_time_string, loader_color } from '../../lib/utils'

const LIMIT = 100

export default () => {
  const { preferences, chains, assets, dev } = useSelector(state => ({ preferences: state.preferences, chains: state.chains, assets: state.assets, dev: state.dev }), shallowEqual)
  const { theme } = { ...preferences }
  const { chains_data } = { ...chains }
  const { assets_data } = { ...assets }
  const { sdk } = { ...dev }

  const router = useRouter()
  const { pathname, query } = { ...router }
  const { address } = { ...query }

  const [data, setData] = useState(null)
  const [offset, setOffet] = useState(0)
  const [fetchTrigger, setFetchTrigger] = useState(null)
  const [fetching, setFetching] = useState(false)
  const [fromChainSelect, setFromChainSelect] = useState('')
  const [toChainSelect, setToChainSelect] = useState('')
  const [assetSelect, setAssetSelect] = useState('')
  const [statusSelect, setStatusSelect] = useState('')
  const [timer, setTimer] = useState(null)

  useEffect(() => {
    if (fromChainSelect && fromChainSelect === toChainSelect) {
      setToChainSelect('')
    }
  }, [fromChainSelect])

  useEffect(() => {
    if (toChainSelect && toChainSelect === fromChainSelect) {
      setFromChainSelect('')
    }
  }, [toChainSelect])

  useEffect(() => {
    const triggering = is_interval => {
      if (sdk) {
        setFetchTrigger(is_interval ? moment().valueOf() : 0)
      }
    }
    triggering()
    const interval = setInterval(() => triggering(true), 0.25 * 60 * 1000)
    return () => {
      clearInterval(interval)
    }
  }, [sdk, pathname, address, statusSelect])

  useEffect(() => {
    if (offset) {
      setFetchTrigger(moment().valueOf())
    }
  }, [offset])

  useEffect(() => {
    const getData = async () => {
      if (sdk) {
        setFetching(true)
        if (!fetchTrigger) {
          setData(null)
          setOffet(0)
        }
        let response
        const status = statusSelect || undefined,
          _data = !fetchTrigger ? [] : (data || []),
          limit = LIMIT
        const offset = _data.length
        switch (pathname) {
          case '/address/[address]':
            if (address) {
              try {
                response = await sdk.nxtpSdkUtils.getTransfersByUser({ userAddress: address, status, range: { limit, offset } })
              } catch (error) {}
            }
            break
          case '/router/[address]':
            if (address) {
              try {
                response = await sdk.nxtpSdkUtils.getTransfersByRouter({ routerAddress: address, status, range: { limit, offset } })
              } catch (error) {}
            }
            break
          default:
            try {
              if (status) {
                response = await sdk.nxtpSdkUtils.getTransfersByStatus({ status, range: { limit, offset } })
              }
              else {
                response = await sdk.nxtpSdkUtils.getTransfers({ range: { limit, offset } })
              }
            } catch (error) {}
            break
        }
        response = _.orderBy(_.uniqBy(_.concat(_data, response || []), 'transfer_id'), ['xcall_timestamp'], ['desc'])
        if (response) {
          response = response.map(t => {
            const source_chain_data = chains_data?.find(c => c?.chain_id === Number(t?.origin_chain))
            const source_asset_data = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === source_chain_data?.chain_id && [t?.origin_transacting_asset, t?.origin_bridged_asset].findIndex(_a => equals_ignore_case(_a, c?.contract_address)) > -1) > -1)
            const source_contract_data = source_asset_data?.contracts?.find(c => c?.chain_id === source_chain_data?.chain_id)
            const destination_chain_data = chains_data?.find(c => c?.chain_id === Number(t?.destination_chain))
            const destination_asset_data = assets_data?.find(a => a?.contracts?.findIndex(c => c?.chain_id === destination_chain_data?.chain_id && [t?.destination_transacting_asset, t?.destination_local_asset].findIndex(_a => equals_ignore_case(_a, c?.contract_address)) > -1) > -1)
            const destination_contract_data = destination_asset_data?.contracts?.find(c => c?.chain_id === destination_chain_data?.chain_id)
            return {
              ...t,
              source_chain_data,
              destination_chain_data,
              source_asset_data: {
                ...source_asset_data,
                ...source_contract_data,
              },
              destination_asset_data: {
                ...destination_asset_data,
                ...destination_contract_data,
              },
              pending: ![XTransferStatus.Executed, XTransferStatus.CompletedFast, XTransferStatus.CompletedSlow].includes(t?.status),
            }
          }).map(t => {
            const { source_asset_data, destination_asset_data, origin_transacting_amount, destination_transacting_amount } = { ...t }
            const source_decimals = source_asset_data?.contract_decimals || 18
            const source_amount = typeof origin_transacting_amount === 'number' && Number(utils.formatUnits(BigNumber.from(BigInt(origin_transacting_amount).toString()), source_decimals))
            const destination_decimals = destination_asset_data?.contract_decimals || 18
            const destination_amount = typeof destination_transacting_amount === 'number' && Number(utils.formatUnits(BigNumber.from(BigInt(destination_transacting_amount).toString()), destination_decimals))
            return {
              ...t,
              source_asset_data: {
                ...source_asset_data,
                amount: source_amount,
              },
              destination_asset_data: {
                ...destination_asset_data,
                amount: destination_amount,
              },
            }
          })
          setData(response)
        }
        else if (!fetchTrigger) {
          setData([])
        }
        setFetching(false)
      }
    }
    getData()
  }, [fetchTrigger])

  /*useEffect(() => {
    const run = async () => {
      if (data && !data.execute_timestamp) {
        setTimer(moment().unix())
      }
    }
    if (!timer) {
      run()
    }
    const interval = setInterval(() => run(), 1 * 1000)
    return () => clearInterval(interval)
  }, [data, timer])*/

  const source_chain_data = chains_data?.find(c => c?.id === fromChainSelect)
  const destination_chain_data = chains_data?.find(c => c?.id === toChainSelect)
  const asset_data = assets_data?.find(a => [a?.source_asset_data?.id, a?.destination_asset_data?.id].includes(a?.id))
  const data_filtered = data?.filter(t =>
    (!source_chain_data || source_chain_data?.id === t?.source_chain_data?.id) &&
    (!destination_chain_data || destination_chain_data?.id === t?.destination_chain_data?.id) &&
    (!asset_data || [t?.source_asset_data?.id, t?.destination_asset_data?.id].includes(asset_data?.id))
  )

  return (
    <div className="space-y-2">
      <div className="sm:flex sm:items-center sm:justify-between">
        <div className="text-base font-bold">
          Latest Transfers
        </div>
        <div className="flex flex-col sm:flex-row sm:items-center space-y-2 sm:space-y-0 space-x-0 sm:space-x-4 mt-2 sm:mt-0 mb-4 sm:mb-0">
          <div className="flex items-center space-x-2">
            {!address && (
              <span className="font-semibold">
                From
              </span>
            )}
            <SelectChain
              value={fromChainSelect}
              onSelect={c => setFromChainSelect(c)}
            />
            <span className="font-semibold">
              To
            </span>
            <SelectChain
              value={toChainSelect}
              onSelect={c => setToChainSelect(c)}
            />
          </div>
          <div className="flex items-center space-x-2 sm:space-x-4">
            <SelectAsset
              value={assetSelect}
              onSelect={a => setAssetSelect(a)}
              chain={[fromChainSelect, toChainSelect]}
            />
            <SelectStatus
              value={statusSelect}
              onSelect={s => setStatusSelect(s)}
            />
          </div>
        </div>
      </div>
      {data_filtered ?
        <div className={`grid gap-${data_filtered.length <= 10 ? 4 : 2} pb-4`}>
          <Datatable
            columns={[
              {
                Header: '#',
                accessor: 'i',
                sortType: (a, b) => a.original.i > b.original.i ? 1 : -1,
                Cell: props => (
                  <span className="font-mono font-semibold">
                    {number_format((props.flatRows?.indexOf(props.row) > -1 ?
                      props.flatRows.indexOf(props.row) : props.value
                    ) + 1, '0,0')}
                  </span>
                ),
              },
              {
                Header: 'Transfer ID',
                accessor: 'transfer_id',
                disableSortBy: true,
                Cell: props => props.value && (
                  <div className="flex flex-col items-start space-y-2">
                    <div className="flex items-center space-x-1">
                      <Link href={`/tx/${props.value}`}>
                        <a className="text-blue-500 dark:text-white font-semibold">
                          <span className="sm:hidden">
                            {ellipse(props.value, address ? 6 : 8)}
                          </span>
                          <span className="hidden sm:block">
                            {ellipse(props.value, address ? 8 : 12)}
                          </span>
                        </a>
                      </Link>
                      <Copy
                        value={props.value}
                        size={20}
                      />
                    </div>
                    {address && (
                      <>
                        <Link href={`/tx/${props.row.original.transfer_id}`}>
                          <a>
                            {props.row.original.pending ?
                              <Pulse duration={1500} forever>
                                <div className="rounded-lg border border-blue-500 dark:border-blue-300 flex items-center text-blue-500 dark:text-blue-300 space-x-1 py-1 px-1.5">
                                  <span className="font-bold">
                                    Transfering
                                  </span>
                                  <ThreeCircles color={loader_color(theme)} width="16" height="16" />
                                </div>
                              </Pulse>
                              :
                              <div className="rounded-lg border border-green-500 dark:border-green-300 flex items-center text-green-500 dark:text-green-300 space-x-1 py-1 px-1.5">
                                <VscPassFilled size={20} />
                                <span className="uppercase font-bold">
                                  Success
                                </span>
                              </div>
                            }
                          </a>
                        </Link>
                        {!props.row.original.pending && (
                          <div className={`font-mono ${props.row.original.pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'} font-semibold`}>
                            {total_time_string(props.row.original.xcall_timestamp, props.row.original.execute_timestamp || moment().unix())}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                ),
              },
              {
                Header: 'Status',
                accessor: 'status',
                disableSortBy: true,
                Cell: props => (
                  <div className="flex flex-col items-start space-y-2">
                    <Link href={`/tx/${props.row.original.transfer_id}`}>
                      <a>
                        {props.row.original.pending ?
                          <Pulse duration={1500} forever>
                            <div className="rounded-lg border border-blue-500 dark:border-blue-300 flex items-center text-blue-500 dark:text-blue-300 space-x-1 py-1 px-1.5">
                              <span className="font-bold">
                                Transfering
                              </span>
                              <ThreeCircles color={loader_color(theme)} width="16" height="16" />
                            </div>
                          </Pulse>
                          :
                          <div className="rounded-lg border border-green-500 dark:border-green-300 flex items-center text-green-500 dark:text-green-300 space-x-1 py-1 px-1.5">
                            <VscPassFilled size={20} />
                            <span className="uppercase font-bold">
                              Success
                            </span>
                          </div>
                        }
                      </a>
                    </Link>
                    {!props.row.original.pending && (
                      <div className={`font-mono ${props.row.original.pending ? 'text-blue-500 dark:text-blue-300' : 'text-yellow-600 dark:text-yellow-400'} font-semibold`}>
                        {total_time_string(props.row.original.xcall_timestamp, props.row.original.execute_timestamp || moment().unix())}
                      </div>
                    )}
                  </div>
                ),
              },
              {
                Header: 'Source',
                accessor: 'source_chain_data',
                disableSortBy: true,
                Cell: props => (
                  <div className="space-y-1.5 mb-3">
                    {props.value ?
                      <div className="flex items-center justify-center sm:justify-start space-x-2">
                        {props.value.image && (
                          <Image
                            src={props.value.image}
                            alt=""
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        <span className="text-sm font-semibold">
                          {props.value.name}
                        </span>
                      </div>
                      :
                      <div className="flex items-center justify-center sm:justify-start">
                        <TailSpin color={loader_color(theme)} width="24" height="24" />
                      </div>
                    }
                    <div className="flex items-center space-x-2">
                      {props.row.original.source_asset_data?.image && (
                        <Image
                          src={props.row.original.source_asset_data.image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      {typeof props.row.original.source_asset_data?.amount === 'number' ?
                        <span className="font-mono font-bold">
                          {number_format(props.row.original.source_asset_data.amount, '0,0.000000', true)}
                        </span>
                        :
                        <RotatingSquare color={loader_color(theme)} width="24" height="24" />
                      }
                      <span className="font-semibold">
                        {props.row.original.source_asset_data?.symbol}
                      </span>
                      {props.row.original.source_asset_data && (
                        <AddToken
                          token_data={{ ...props.row.original.source_asset_data }}
                        />
                      )}
                    </div>
                    {props.row.original.xcall_caller && (
                      <div className="flex items-center justify-center sm:justify-start space-x-1.5">
                        <Link href={`/address/${props.row.original.xcall_caller}`}>
                          <a>
                            <EnsProfile
                              address={props.row.original.xcall_caller}
                              no_copy={true}
                              fallback={<span className="font-semibold">
                                <span className="sm:hidden">
                                  {ellipse(props.row.original.xcall_caller, 6)}
                                </span>
                                <span className="hidden sm:block">
                                  {ellipse(props.row.original.xcall_caller, 8)}
                                </span>
                              </span>}
                            />
                          </a>
                        </Link>
                        <Copy
                          value={props.row.original.xcall_caller}
                          size={20}
                        />
                      </div>
                    )}
                  </div>
                ),
              },
              {
                Header: 'Destination',
                accessor: 'destination_chain_data',
                disableSortBy: true,
                Cell: props => (
                  <div className="space-y-1.5 mb-3">
                    {props.value ?
                      <div className="flex items-center justify-center sm:justify-start space-x-2">
                        {props.value.image && (
                          <Image
                            src={props.value.image}
                            alt=""
                            width={24}
                            height={24}
                            className="rounded-full"
                          />
                        )}
                        <span className="text-sm font-semibold">
                          {props.value.name}
                        </span>
                      </div>
                      :
                      <div className="flex items-center justify-center sm:justify-start">
                        <TailSpin color={loader_color(theme)} width="24" height="24" />
                      </div>
                    }
                    <div className="flex items-center space-x-2">
                      {props.row.original.destination_asset_data?.image && (
                        <Image
                          src={props.row.original.destination_asset_data.image}
                          alt=""
                          width={24}
                          height={24}
                          className="rounded-full"
                        />
                      )}
                      {typeof props.row.original.destination_asset_data?.amount === 'number' ?
                        <span className="font-mono font-bold">
                          {number_format(props.row.original.destination_asset_data.amount, '0,0.000000', true)}
                        </span>
                        :
                        <RotatingSquare color={loader_color(theme)} width="24" height="24" />
                      }
                      <span className="font-semibold">
                        {props.row.original.destination_asset_data?.symbol}
                      </span>
                      {props.row.original.destination_asset_data && (
                        <AddToken
                          token_data={{ ...props.row.original.destination_asset_data }}
                        />
                      )}
                    </div>
                    {props.row.original.to && (
                      <div className="flex items-center justify-center sm:justify-start space-x-1.5">
                        <Link href={`/address/${props.row.original.to}`}>
                          <a>
                            <EnsProfile
                              address={props.row.original.to}
                              no_copy={true}
                              fallback={<span className="font-semibold">
                                <span className="sm:hidden">
                                  {ellipse(props.row.original.to, 6)}
                                </span>
                                <span className="hidden sm:block">
                                  {ellipse(props.row.original.to, 8)}
                                </span>
                              </span>}
                            />
                          </a>
                        </Link>
                        <Copy
                          value={props.row.original.to}
                          size={20}
                        />
                      </div>
                    )}
                  </div>
                ),
              },
            ].filter(c => !address || !['status'].includes(c.accessor))}
            data={data_filtered}
            noPagination={data_filtered.length <= 10}
            defaultPageSize={address ? 10 : 25}
            className="no-border"
          />
          {data.length > 0/* && data.length % LIMIT === 0*/ && (
            !fetching ?
              <button
                onClick={() => setOffet(data.length)}
                className="max-w-min hover:bg-slate-100 dark:hover:bg-slate-900 rounded-lg whitespace-nowrap font-medium hover:font-bold mx-auto py-1.5 px-2.5"
              >
                Load more
              </button>
              :
              <div className="flex justify-center p-1.5">
                <TailSpin color={loader_color(theme)} width="24" height="24" />
              </div>
          )}
        </div>
        :
        <TailSpin color={loader_color(theme)} width="32" height="32" />
      }
    </div>
  )
}