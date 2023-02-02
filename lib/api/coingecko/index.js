import { getRequestUrl } from '../../utils'

const _module = 'coingecko'

const request = async (path, params) => {
  const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_API_URL, path, { ...params, module: _module }))
    .catch(error => { return null })
  return res && await res.json()
}

export const coin = async (id, params) => {
  const path = `/coins/${id}`
  return await request(path, params)
}