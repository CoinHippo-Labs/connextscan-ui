export const chainName = data => data?.name && data.name.split(' ').length < 3 ? data.name : data?.short_name
export const connext = {
  id: 'connext',
  name: 'Connext',
  short_name: 'NXTP',
  image: '/logos/logo.png',
  website: 'https://connext.network',
  coingecko_id: 'connext',
  menu_hidden: true,
}