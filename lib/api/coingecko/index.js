const _module = 'coingecko'

const request = async (path, params) => {
  params = { ...params, path, module: _module }
  const res = await fetch(process.env.NEXT_PUBLIC_API_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

export const coin = async (id, params) => {
  const path = `/coins/${id}`
  return await request(path, params)
}