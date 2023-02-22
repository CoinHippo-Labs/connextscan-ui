import _ from 'lodash'
import { XTransferStatus, XTransferErrorStatus } from '@connext/nxtp-utils'

const STATUSES =
  [
    XTransferStatus.XCalled,
    XTransferStatus.Executed,
    XTransferStatus.Reconciled,
    XTransferStatus.CompletedFast,
    XTransferStatus.CompletedSlow,
  ]

const ERROR_STATUSES =
  [
    XTransferErrorStatus.LowRelayerFee,
    XTransferErrorStatus.LowSlippage,
    XTransferErrorStatus.ExecutionError,
  ]

export default (
  {
    value,
    onClick,
  },
) => {
  return (
    <>
      <div className="text-slate-400 dark:text-slate-500 text-xs pt-2 pb-1 px-3">
        Xcall Status
      </div>
      <div className="flex flex-wrap pb-1">
        {_.concat('', STATUSES)
          .map(s => {
            const selected = s === value

            const item = (
              <span className={`whitespace-nowrap leading-4 ${selected ? 'font-bold': ''}`}>
                {s || 'Any'}
              </span>
            )

            return (
              <div
                key={s}
                onClick={() => onClick(s)}
                className={`${selected ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-700'} w-full cursor-pointer flex items-center justify-start space-x-1 py-2 px-3`}
              >
                {item}
              </div>
            )
          })
        }
      </div>
      <div className="text-slate-400 dark:text-slate-500 text-xs py-1 px-3">
        Error Status
      </div>
      <div className="flex flex-wrap pb-1">
        {ERROR_STATUSES
          .map(s => {
            const selected = s === value

            const item = (
              <span className={`whitespace-nowrap leading-4 ${selected ? 'font-bold': ''}`}>
                {s}
              </span>
            )

            return (
              <div
                key={s}
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