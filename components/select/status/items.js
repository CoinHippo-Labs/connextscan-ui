import { XTransferStatus } from '@connext/nxtp-utils'
import _ from 'lodash'

const STATUSES = [
  XTransferStatus.XCalled,
  XTransferStatus.Executed,
  XTransferStatus.Reconciled,
  XTransferStatus.CompletedFast,
  XTransferStatus.CompletedSlow,
]

export default ({ value, onClick }) => {
  return (
    <div className="flex flex-wrap pb-1">
      {_.concat('', STATUSES).map((d, i) => {
        const selected = d === value
        const item = (
          <span className={`whitespace-nowrap leading-4 ${selected ? 'font-bold': ''}`}>
            {d || 'Any'}
          </span>
        )
        return (
          <div
            key={i}
            onClick={() => onClick(d)}
            className={`${selected ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-700'} w-full cursor-pointer flex items-center justify-start space-x-1 py-2 px-3`}
          >
            {item}
          </div>
        )
      })}
    </div>
  )
}