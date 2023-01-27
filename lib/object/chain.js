export const chainName = data =>
  data?.name &&
  data.name.split(' ').length < 3 ?
    data.name :
    data?.short_name

export const connext =
  {
    id: 'connext',
    name: 'Connext',
    short_name: 'NEXT',
    image: '/logos/logo.png',
    website: process.env.NEXT_PUBLIC_PROTOCOL_URL,
    coingecko_id: 'connext',
    menu_hidden: true,
  }