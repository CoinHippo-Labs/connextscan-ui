const routes = [
  { pathname: '/' },
  { pathname: '/routers' },
  { pathname: '/leaderboard/routers' },
  { pathname: '/transactions' },
  { pathname: '/status', },
  { pathname: '/tx/[tx]' },
  { pathname: '/router/[address]' },
  { pathname: '/address/[address]' },
  { pathname: '/[blockchain_id]' },
]

export const isMatchRoute = pathname => {
  return routes.findIndex((route, i) => {
    if (route.pathname === pathname) {
      return true
    }
    else if (route.pathname.split('/').filter(path => path).length === pathname.split('/').filter(path => path).length) {
      const routePathnameSplit = route.pathname.split('/').filter(path => path)
      const pathnameSplit = pathname.split('/').filter(path => path)

      return routePathnameSplit.findIndex((path, j) => !(path.startsWith('[') && path.endsWith(']')) && path !== pathnameSplit[j]) > -1 ? false : true
    }
    else {
      return false
    }
  }) > -1
}