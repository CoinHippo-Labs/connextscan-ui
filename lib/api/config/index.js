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

  const response = await fetch(
    process.env.NEXT_PUBLIC_API_URL,
    {
      method: 'POST',
      body: JSON.stringify(params),
    },
  ).catch(error => { return null })

  return response &&
    await response.json()
}

export const chains = async params => {
  const is_staging = process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  params = {
    ...params,
    collection: 'chains',
  }

  const response = await request(
    null,
    params,
  )

  return {
    ...response,
    evm: response?.evm?.filter(a => !a?.is_staging || is_staging) || [],
  }
}

export const assets = async params => {
  params = {
    ...params,
    collection: 'assets',
  }

  return await request(
    null,
    params,
  )
}