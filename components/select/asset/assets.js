import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Image from '../../image'

export default (
  {
    value,
    inputSearch,
    onSelect,
    chain,
  },
) => {
  const {
    chains,
    assets,
  } = useSelector(state =>
    (
      {
        chains: state.chains,
        assets: state.assets,
      }
    ),
    shallowEqual,
  )
  const {
    chains_data,
  } = { ...chains }
  const {
    assets_data,
  } = { ...assets }

  const chain_data = (chains_data || [])
    .find(c =>
      Array.isArray(chain) ?
        chain.includes(c?.id) :
        c?.id === chain
    )

  const {
    chain_id,
  } = { ...chain_data }

  const assets_data_sorted =
    _.concat(
      {
        id: '',
        name: 'All Assets',
      },
      _.orderBy(
        (assets_data || [])
          .filter(a =>
            !inputSearch ||
            a
          )
          .map(a => {
            return {
              ...a,
              scores:
                [
                  'symbol',
                  'name',
                  'id',
                ]
                .map(f =>
                  (a[f] || '')
                    .toLowerCase()
                    .includes(
                      inputSearch
                        .toLowerCase()
                    ) ?
                    inputSearch.length > 1 ?
                      (
                        inputSearch.length /
                        a[f].length
                      ) :
                      .5 :
                  -1
                ),
            }
          })
          .map(a => {
            const {
              scores,
            } = { ...a }

            return {
              ...a,
              max_score:
                _.max(
                  scores,
                ),
            }
          })
          .filter(a =>
            a.max_score > 1 / 10
          ),
        ['max_score'],
        ['desc'],
      ),
    )

  return (
    <div className="max-h-96 overflow-y-scroll">
      {
        assets_data_sorted
          .map((a, i) => {
            const {
              id,
              disabled,
              contracts,
            } = { ...a }

            const selected = id === value

            const contract_data = (contracts || [])
              .find(c =>
                c?.chain_id === chain_id
              )

            let {
              symbol,
              image,
            } = { ...contract_data }

            symbol =
              symbol ||
              a?.symbol ||
              a?.name

            image =
              image ||
              a?.image

            const item =
              (
                <>
                  {
                    image &&
                    (
                      <Image
                        src={image}
                        width={32}
                        height={32}
                        className="rounded-full"
                      />
                    )
                  }
                  <span className={`whitespace-nowrap text-base ${selected ? 'font-bold' : 'font-normal'}`}>
                    {symbol}
                  </span>
                </>
              )

            const className =
              `dropdown-item ${
                disabled ?
                  'cursor-not-allowed' :
                  selected ?
                    'bg-slate-100 dark:bg-slate-800 cursor-pointer' :
                    'hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'
              } rounded-lg flex items-center justify-start space-x-2 p-2`

            return (
              disabled ?
                <div
                  key={i}
                  title="Disabled"
                  className={className}
                >
                  {item}
                </div> :
                <div
                  key={i}
                  onClick={
                    () =>
                      onSelect(id)
                  }
                  className={className}
                >
                  {item}
                </div>
            )
          })
      }
    </div>
  )
}