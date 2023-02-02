import { timeframes } from '../../lib/object/timeframe'

export default function Timeframes({ handleDropdownClick }) {
  return (
    <div className="flex flex-wrap">
      {timeframes.map((item, i) => (
        <div
          key={i}
          title={item?.disabled && 'Not available yet'}
          onClick={() => {
            if (!item?.disabled && handleDropdownClick) {
              handleDropdownClick(item)
            }
          }}
          className={`w-full bg-white dark:bg-black hover:bg-gray-100 dark:hover:bg-gray-900 ${item?.disabled ? 'cursor-not-allowed' : 'cursor-pointer'} flex items-center justify-end text-sm font-semibold space-x-1.5 p-2`}
        >
          {item?.title}
        </div>
      ))}
    </div>
  )
}