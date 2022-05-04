import { useSelector, shallowEqual } from 'react-redux'
import { MdLocalGasStation } from 'react-icons/md'

import Gas from './gas'

export default () => {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  return (
    <div className="bg-slate-100 dark:bg-slate-900 right-0 rounded-xl -mt-16">
      <div className="flex items-center justify-center space-x-1 py-2 px-3">
        <MdLocalGasStation size={20} />
        <span className="font-semibold">Gas</span>
      </div>
      {chains_data && (
        <div className="flex flex-col mb-2">
          {chains_data.filter(c => !c?.disabled).map((c, i) => (
            <Gas
              key={i}
              chainId={c?.chain_id}
            />
          ))}
        </div>
      )}
    </div>
  )
}