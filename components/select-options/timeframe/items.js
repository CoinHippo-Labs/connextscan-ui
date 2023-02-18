import { timeframes } from '../../../lib/object/timeframe'

export default (
  {
    value,
    onClick,
  },
) => {
  return (
    <div className="flex flex-wrap pb-1">
      {timeframes
        .map((t, i) => {
          const {
            day,
            title,
          } = { ...t }

          const selected = day === value

          const item = (
            <span className={`whitespace-nowrap leading-4 ${selected ? 'font-bold': ''}`}>
              {title}
            </span>
          )

          return (
            <div
              key={i}
              onClick={() => onClick(day)}
              className={`${selected ? 'bg-slate-100 dark:bg-slate-800' : 'hover:bg-slate-50 dark:hover:bg-slate-700'} w-full cursor-pointer flex items-center justify-start space-x-1 py-2 px-3`}
            >
              {item}
            </div>
          )
        })
      }
    </div>
  )
}