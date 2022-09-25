import { useState, useEffect } from 'react'
import moment from 'moment'
import Popover from '../popover'

import { total_time_string } from '../../lib/utils'

export default ({
  from_time,
  to_time,
  placement = 'top',
  title = 'time',
  titleClassName = 'h-8 normal-case text-xs font-semibold',
  className = 'normal-case text-slate-400 dark:text-slate-600 font-normal',
}) => {
  const [trigger, setTrigger] = useState(false)

  useEffect(() => {
    const timeout = setTimeout(() =>
      setTrigger(!trigger),
      1 * 1000,
    )

    return () => clearTimeout(timeout)
  }, [trigger])

  const _from_time = from_time &&
    moment(
      !isNaN(from_time) ?
        Number(from_time) * 1000 :
        from_time
    )

  const _to_time =
    moment(
      to_time ?
        !isNaN(to_time) ?
          Number(to_time) * 1000 :
          to_time :
        undefined
    )

  const time_string = total_time_string(
    from_time,
    to_time ||
      moment().unix(),
  )

  return _from_time &&
    _to_time &&
    (
      <Popover
        placement={placement}
        title={title}
        content={<div className="w-38 whitespace-nowrap text-2xs font-normal space-x-1">
          <span>
            {_from_time.format('MMM D, YYYY h:mm:ss A')}
          </span>
          <span>
            -
          </span>
          <span>
            {_to_time.format('MMM D, YYYY h:mm:ss A')}
          </span>
        </div>}
        titleClassName={titleClassName}
        className={className}
      >
        <div className={className}>
          {time_string}
        </div>
      </Popover>
    )
}