import _ from 'lodash'

import { split, name } from './utils'

export default (
  path,
  data,
) => {
  path = !path ? '/' : path.toLowerCase()
  path = path.includes('?') ? path.substring(0, path.indexOf('?')) : path

  const _paths = split(path, 'normal', '/')

  let title = `${_.reverse(_.cloneDeep(_paths)).map(x => name(x, data)).join(' - ')}${_paths.length > 0 ? ` | ${process.env.NEXT_PUBLIC_APP_NAME}` : process.env.NEXT_PUBLIC_DEFAULT_TITLE}`

  const description = process.env.NEXT_PUBLIC_DEFAULT_DESCRIPTION
  const image = `${process.env.NEXT_PUBLIC_APP_URL}/images/ogimage.png`
  const url = `${process.env.NEXT_PUBLIC_APP_URL}${path}`

  switch (path) {
    case '/tx/[tx]':
      title = `Transfer | ${process.env.NEXT_PUBLIC_APP_NAME}`
      break
    case '/address/[address]':
      title = `Address | ${process.env.NEXT_PUBLIC_APP_NAME}`
      break
    case '/router/[address]':
      title = `Router | ${process.env.NEXT_PUBLIC_APP_NAME}`
      break
    case '/[chain]':
      title = process.env.NEXT_PUBLIC_DEFAULT_TITLE
      break
    default:
      title = process.env.NEXT_PUBLIC_DEFAULT_TITLE
      break
  }

  return {
    title,
    description,
    url,
    image,
  }
}