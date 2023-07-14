import { useState, useEffect } from 'react'
import moment from 'moment'
import { Tooltip } from '@material-tailwind/react'

import { createMomentFromUnixtime } from '../../lib/utils'

export default (
  {
    time,
    format = 'MMM D, YYYY h:mm:ss A',
    noTooltip = false,
    placement = 'top',
    title = 'Time',
    titleClassName = 'normal-case text-xs font-semibold',
    className = 'normal-case text-slate-400 dark:text-slate-500 font-normal',
  },
) => {
  const [trigger, setTrigger] = useState(false)

  useEffect(
    () => {
      const timeout = setTimeout(() => setTrigger(!trigger), 1 * 1000)
      return () => clearTimeout(timeout)
    },
    [trigger],
  )

  const _time = createMomentFromUnixtime(time)
  const second_diff = moment().diff(_time, 'seconds')
  const time_string = second_diff > 59 || second_diff <= 0 ? _time.fromNow() : `${second_diff}s ago`

  return _time && (
    !noTooltip ?
      <Tooltip
        placement={placement}
        content={
          <div className="flex flex-col space-y-1 my-1">
            <div className={titleClassName}>
              {title}
            </div>
            <div className={className}>
              <div className="w-38 whitespace-nowrap text-xs font-medium">
                <span>{_time.format(format)}</span>
              </div>
            </div>
          </div>
        }
        className="z-50 bg-dark text-white text-xs"
      >
        <div className={className}>
          {time_string}
        </div>
      </Tooltip> :
      <div className={className}>
        {time_string}
      </div>
  )
}