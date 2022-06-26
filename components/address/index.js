import Transfers from '../transfers'
import Gases from '../gases'

export default () => {
  return (
    <div className="flex items-start justify-between space-x-2 -mr-1.5 sm:-mr-3.5">
      <div className="w-full grid grid-flow-row lg:grid-cols-2 gap-4 lg:gap-6 mb-4">
        <Transfers />
      </div>
      <Gases />
    </div>
  )
}