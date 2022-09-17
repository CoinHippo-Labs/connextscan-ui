const _module = 'coingecko'

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

export const token = async (
  id,
  params,
) =>
  await request(
    `/coins/${id}`,
    params,
  )