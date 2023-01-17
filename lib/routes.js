export const routes =
  [
    { pathname: '/' },
    { pathname: '/transfers' },
    { pathname: '/routers' },
    { pathname: '/tx/[tx]' },
    { pathname: '/address/[address]' },
    { pathname: '/router/[address]' },
    { pathname: '/[chain]' },
  ]

export const is_route_exist = pathname =>
  routes.findIndex((r, i) => {
    if (r.pathname === pathname)
      return true

    if (
      r.pathname
        .split('/')
        .filter(p => p)
        .length ===
      pathname
        .split('/')
        .filter(p => p)
        .length
    ) {
      const route_paths = r.pathname
        .split('/')
        .filter(p => p)

      const paths = pathname
        .split('/')
        .filter(p => p)

      return !(
        route_paths.findIndex((p, j) =>
          !(
            p.startsWith('[') &&
              p.endsWith(']')
          ) &&
          p !== paths[j]
        ) > -1
      )
    }

    return false
  }) > -1