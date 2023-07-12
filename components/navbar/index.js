import Logo from './logo'
import DropdownNavigations from './navigations/dropdown'
import Navigations from './navigations'
import Search from './search'
import Chains from './chains'
import Theme from './theme'

export default () => {
  return (
    <div className="navbar 3xl:pt-6">
      <div className="navbar-inner w-full h-20 flex items-center justify-between sm:space-x-4">
        <div className="flex items-center">
          <Logo />
          <DropdownNavigations />
        </div>
        <div className="flex items-center justify-center">
          <Navigations />
        </div>
        <div className="flex items-center justify-end 3xl:space-x-4">
          <Search />
          <Chains />
          <Theme />
        </div>
      </div>
    </div>
  )
}