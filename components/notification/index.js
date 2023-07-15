import { useState, useEffect } from 'react'
import { BiX, BiMessageError, BiMessageCheck } from 'react-icons/bi'

import Portal from '../modal/portal'
import Spinner from '../spinner'

export default (
  {
    hidden = false,
    disabled,
    onClick,
    buttonTitle,
    buttonClassName,
    buttonStyle = {},
    status,
    color,
    icon,
    body,
    noButton = true,
    onClose,
    animation = 'animate__animated animate__fadeInDown',
    className = 'w-full h-auto z-50 transform fixed top-0 left-0 p-0',
  },
) => {
  const [open, setOpen] = useState(!hidden)

  const show = () => {
    if (onClick) {
      onClick(true)
    }
    setOpen(true)
  }

  const hide = () => {
    if (typeof hidden !== 'boolean') {
      setOpen(false)
    }
  }

  useEffect(
    () => {
      if (typeof hidden === 'boolean') {
        setOpen(!hidden)
      }
    },
    [hidden],
  )

  const iconCSS = 'w-4 sm:w-6 h-4 sm:h-6 mr-2'
  switch (status) {
    case 'success':
      color = color || 'bg-green-400 dark:bg-green-500'
      icon = icon || <BiMessageCheck className={iconCSS} />
      break
    case 'failed':
      color = color || 'bg-red-400 dark:bg-red-500'
      icon = icon || <BiMessageError className={iconCSS} />
      break
    default:
      color = color || 'bg-blue-400 dark:bg-blue-500'
      icon = icon || (
        <div className={`${iconCSS} flex items-center`}>
          <Spinner name="Watch" width={20} height={20} />
        </div>
      )
      break
  }

  return (
    <>
      {!noButton && (
        <button
          type="button"
          disabled={disabled}
          onClick={show}
          className={buttonClassName || 'btn btn-default btn-rounded bg-blue-500 hover:bg-blue-600 dark:bg-blue-500 dark:hover:bg-blue-400 text-white text-sm 3xl:text-base'}
          style={buttonStyle}
        >
          {buttonTitle}
        </button>
      )}
      {open && (
        <Portal selector="#portal">
          <div className={`${!hidden ? animation : ''} ${className}`}>
            <div className={`w-full flex items-center text-white justify-start p-4 ${color}`}>
              {icon && (
                <div className="flex-shrink">
                  {icon}
                </div>
              )}
              <div className="flex-grow">
                {body}
              </div>
              <div className="flex-shrink">
                <button onClick={hide} className="flex items-center justify-center ml-auto">
                  <BiX size={16} className="ml-2" />
                </button>
              </div>
            </div>
          </div>
        </Portal>
      )}
    </>
  )
}