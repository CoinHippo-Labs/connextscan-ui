import { BsThreeDots } from 'react-icons/bs'

export const PageWithText = ({
  disabled = false,
  active,
  onClick,
  activeClassNames = 'btn btn-default bg-blue-600 hover:bg-blue-500 rounded-lg text-white',
  inactiveClassNames = 'btn btn-default bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 rounded-lg text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-100',
  children,
}) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={active ? activeClassNames : inactiveClassNames}
  >
    {children}
  </button>
)

export const Page = ({
  disabled = false,
  active,
  onClick,
  activeClassNames = 'btn btn-circle bg-blue-600 hover:bg-blue-500 text-white',
  inactiveClassNames = 'btn btn-circle bg-gray-100 hover:bg-gray-200 dark:bg-gray-900 dark:hover:bg-gray-800 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-100',
  children,
}) => (
  <button
    disabled={disabled}
    onClick={onClick}
    className={active ? activeClassNames : inactiveClassNames}
  >
    {children}
  </button>
)

export const Pages = ({
  items = [],
  disabled = false,
  active,
  onClick,
}) => {
  const hide = i => items.length > 10 && [0, items.length - 1, active - 1].findIndex((_i, index) => Math.floor(Math.abs(i - _i)) < (index < 2 ? 3 : items.length < 20 ? 2 : 3)) < 0
  return (
    <>
      {items.map(i => hide(i) ?
        <div
          key={i}
          className={`${hide(i - 1) ? 'hidden' : ''}`}
        >
          <BsThreeDots size={20} className="text-gray-300 dark:text-gray-600 mt-1.5" />
        </div>
        :
        <Page
          key={i}
          disabled={disabled}
          active={i + 1 === active}
          onClick={() => onClick(i + 1)}
        >
          {i + 1}
        </Page>
      )}
    </>
  )
}

export default ({
  items,
  disabled = false,
  active,
  icons = false,
  previous = 'Previous',
  next = 'Next',
  onClick,
}) => {
  previous = active - 1 > 0 && previous
  next = active + 1 <= items.length && next
  return (
    <div className="pagination flex flex-wrap items-center justify-center space-x-2">
      {previous && (icons ?
        <Page
          disabled={disabled}
          onClick={() => onClick(active - 1)}
        >
          {previous}
        </Page>
        :
        <PageWithText
          disabled={disabled}
          onClick={() => onClick(active - 1)}
        >
          {previous}
        </PageWithText>
      )}
      <Pages
        items={items}
        disabled={disabled}
        active={active}
        onClick={onClick}
      />
      {next && (icons ?
        <Page
          disabled={disabled}
          onClick={() => onClick(active + 1)}
        >
          {next}
        </Page>
        :
        <PageWithText
          disabled={disabled}
          onClick={() => onClick(active + 1)}
        >
          {next}
        </PageWithText>
      )}
    </div>
  )
}