import { useSelector, shallowEqual } from 'react-redux'
import _ from 'lodash'

import Image from '../../image'

export default ({ value, inputSearch, onSelect }) => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  const chains_data_sorted = _.concat({ id: '', name: 'All Chains' }, _.orderBy(
    chains_data?.filter(c => !inputSearch || c).map(c => {
      return {
        ...c,
        scores: ['short_name', 'name', 'id'].map(f => c[f]?.toLowerCase().includes(inputSearch.toLowerCase()) ?
          inputSearch.length > 1 ? (inputSearch.length / c[f].length) : .5 : -1
        ),
      }
    }).map(c => {
      return {
        ...c,
        max_score: _.max(c.scores),
      }
    }).filter(c => c.max_score > 1 / 10) || [],
    ['max_score'], ['desc']
  ))

  return (
    <div className="max-h-96 overflow-y-scroll">
      {chains_data_sorted?.map((c, i) => {
        const selected = c.id === value
        const className = `dropdown-item ${c.disabled ? 'cursor-not-allowed' : selected ? 'bg-slate-100 dark:bg-slate-800 cursor-pointer' : 'hover:bg-slate-50 dark:hover:bg-slate-700 cursor-pointer'} rounded-lg flex items-center justify-start space-x-2 p-2`
        const item = (
          <>
            {c.image && (
              <Image
                src={c.image}
                alt=""
                width={32}
                height={32}
                className="rounded-full"
              />
            )}
            <span className={`whitespace-nowrap text-base ${selected ? 'font-bold' : 'font-normal'}`}>
              {c.name}
            </span>
          </>
        )
        return c.disabled ?
          <div
            key={i}
            title="Disabled"
            className={className}
          >
            {item}
          </div>
          :
          <div
            key={i}
            onClick={() => onSelect(c.id)}
            className={className}
          >
            {item}
          </div>
      })}
    </div>
  )
}