import { useRouter } from 'next/router'
import { useEffect, useState, useRef } from 'react'
import { useSelector, useDispatch, shallowEqual } from 'react-redux'
import _ from 'lodash'
import { useForm } from 'react-hook-form'
import { FiSearch } from 'react-icons/fi'

import { ens as getEns, domainFromEns } from '../../../lib/api/ens'
import { type } from '../../../lib/object/id'
import { equals_ignore_case } from '../../../lib/utils'
import { ENS_DATA } from '../../../reducers/types'

export default () => {
  const dispatch = useDispatch()
  const {
    ens,
    asset_balances,
  } = useSelector(state =>
    (
      {
        ens: state.ens,
        asset_balances: state.asset_balances,
      }
    ),
    shallowEqual,
  )
  const {
    ens_data,
  } = { ...ens }
  const {
    asset_balances_data,
  } = { ...asset_balances }

  const router = useRouter()
  const {
    query,
  } = { ...router }
  const {
    address,
    tx,
  } = { ...query }

  const [inputSearch, setInputSearch] = useState('')
  const [routerIds, setRouterIds] = useState(null)

  const inputSearchRef = useRef()
  const {
    handleSubmit,
  } = useForm()

  useEffect(
    () => {
      if (asset_balances_data) {
        setRouterIds(
          _.uniq(
            Object.values(asset_balances_data)
              .flatMap(a => a)
              .map(a =>
                a?./*router_*/address
              )
              .filter(a => a)
          )
        )
      }
    },
    [asset_balances_data],
  )

  const onSubmit = async () => {
    let input = inputSearch,
      input_type = type(input)

    if (input_type) {
      if (
        (routerIds || [])
          .includes(
            input?.toLowerCase()
          )
      ) {
        input_type = 'router'
      }
      else if (
        Object.values({ ...ens_data })
          .findIndex(v =>
            equals_ignore_case(
              v?.name,
              input,
            )
          ) > -1
      ) {
        const {
          resolvedAddress,
        } = {
          ...(
            Object.values(ens_data)
              .find(v =>
                equals_ignore_case(
                  v?.name,
                  input,
                )
              )
          ),
        }
        const {
          id,
        } = { ...resolvedAddress }

        input = id
        input_type =
          (routerIds || [])
            .includes(
              input?.toLowerCase()
            ) ?
            'router' :
            'address'
      }
      else if (input_type === 'ens') {
        const domain =
          await domainFromEns(
            input,
            ens_data,
          )

        const {
          resolvedAddress,
        } = { ...domain }
        const {
          id,
        } = { ...resolvedAddress }

        if (id) {
          input = id

          dispatch(
            {
              type: ENS_DATA,
              value: {
                [`${input.toLowerCase()}`]: domain,
              },
            }
          )
        }

        input_type =
          (routerIds || [])
            .includes(
              input?.toLowerCase()
            ) ?
              'router' :
              'address'
      }

      if (input_type === 'address') {
        const addresses =
          [
            input?.toLowerCase()
          ]
          .filter(a =>
            a &&
            !ens_data?.[a]
          )

        const ens_data = await getEns(addresses)

        if (ens_data) {
          dispatch(
            {
              type: ENS_DATA,
              value: ens_data,
            }
          )
        }
      }

      router
        .push(
          `/${input_type}/${input}${
            [
              'tx',
            ]
            .includes(input_type) ?
              '?src=search' :
              ''
          }`
        )

      setInputSearch('')

      inputSearchRef?.current?.blur()
    }
  }

  const canSearch =
    inputSearch &&
    [
      address,
      tx,
    ]
    .filter(s => s)
    .findIndex(s =>
      equals_ignore_case(
        s,
        inputSearch,
      )
    ) < 0

  return (
    <div className="navbar-search mr-2 sm:mx-3">
      <form
        onSubmit={
          handleSubmit(onSubmit)
        }
      >
        <div className="relative">
          <input
            ref={inputSearchRef}
            type="search"
            placeholder="Search by Transfer ID / Address / ENS"
            value={inputSearch}
            onChange={
              e =>
                setInputSearch(
                  (e.target.value || '')
                    .trim()
                )
            }
            className={`w-52 sm:w-80 h-10 appearance-none focus:ring-0 rounded text-sm pl-3 ${canSearch ? 'pr-10' : 'pr-3'}`}
          />
          {
            canSearch &&
            (
              <button
                onClick={() => onSubmit()}
                className="bg-blue-600 hover:bg-blue-700 dark:bg-blue-600 dark:hover:bg-blue-500 absolute rounded-lg text-white right-0 p-1.5 mt-1.5 mr-2"
              >
                <FiSearch
                  size={16}
                />
              </button>
            )
          }
        </div>
      </form>
    </div>
  )
}