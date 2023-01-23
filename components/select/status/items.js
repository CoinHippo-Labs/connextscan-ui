import _ from 'lodash'
import { XTransferStatus } from '@connext/nxtp-utils'

const STATUSES =
  [
    XTransferStatus.XCalled,
    XTransferStatus.Executed,
    XTransferStatus.Reconciled,
    XTransferStatus.CompletedFast,
    XTransferStatus.CompletedSlow,
  ]

export default (
  {
    value,
    onClick,
  },
) => {
  return (
    <>
      <div className="text-slate-400 dark:text-slate-500 text-xs pt-1.5 pb-0.5 px-3">
        Xcall Status
      </div>
      <div className="flex flex-wrap pb-1">
        {
          _.concat(
            '',
            STATUSES,
          )
          .map((s, i) => {
            const selected = s === value

            const item = (
              <span className={`whitespace-nowrap leading-4 ${selected ? 'font-bold': ''}`}>
                {
                  s ||
                  'Any'
                }
              </span>
            )

            return (
              <div
                key={i}
                onClick={() => onClick(s)}
                className={`${selected ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-700'} w-full cursor-pointer flex items-center justify-start space-x-1 py-2 px-3`}
              >
                {item}
              </div>
            )
          })
        }
      </div>
    </>
  )
}