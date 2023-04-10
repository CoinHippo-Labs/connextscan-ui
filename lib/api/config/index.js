import { toArray } from '../../utils'

const _module = 'data'

const request = async (
  path,
  params,
) => {
  params = {
    ...params,
    path,
    module: _module,
  }

  const response = await fetch(process.env.NEXT_PUBLIC_API_URL, { method: 'POST', body: JSON.stringify(params) }).catch(error => { return null })
  return response && await response.json()
}

const is_staging = process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' || process.env.NEXT_PUBLIC_APP_URL?.includes('staging')

export const getChains = async params => {
  const response = await request(null, { ...params, collection: 'chains' })

  const {
    evm,
  } = { ...response }

  return {
    ...response,
    evm:
      toArray(evm)
        .filter(c => !c?.is_staging || is_staging)
        .map((c, i) => {
          const {
            hostname,
          } = { ...(typeof window !== 'undefined' ? window.location : null) }

          if (!process.env.NEXT_PUBLIC_APP_URL?.includes(hostname)) {
            delete c.rpc_urls
          }

          return {
            ...c,
            i,
          }
        }),
  }
}

export const getAssets = async params => {
  const response = await request(null, { ...params, collection: 'assets' })
  return toArray(response).map((a, i) => { return { ...a, i } })
}