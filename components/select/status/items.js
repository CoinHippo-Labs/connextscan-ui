import _ from 'lodash'
import { XTransferStatus } from '@connext/nxtp-utils'

const STATUSES = [XTransferStatus.Executed, XTransferStatus.Reconciled, XTransferStatus.Completed]

export default ({
  value,
  onClick,
}) => {
  return (
    <div className="flex flex-wrap pb-1">
      {_.concat('', STATUSES).map((s, i) => {
        const selected = s === value
        const item = (
          <span className={`whitespace-nowrap leading-4 ${selected ? 'font-bold': ''}`}>
            {s || 'All Status'}
          </span>
        )
        return (
          <div
            key={i}
            onClick={() => onClick(s)}
            className={`${selected ? 'bg-slate-100 dark:bg-slate-800' : ''} w-full cursor-pointer flex items-center justify-start space-x-1 py-2 px-3`}
          >
            {item}
          </div>
        )
      })}
    </div>
  )
}