export const chainTitle = data => data?.title && data.title.split(' ').length < 3 ? data.title : data?.short_name

export const connext = {
  id: '',
  title: 'Connext',
  short_name: 'NXTP',
  image: '/logos/logo.png',
  explorer: null,
  menu_hidden: true,
}

export const chainExtraData = chain_id => {
  let data

  switch (chain_id) {
    case 1:
      data = {
        ...data,
        info_url: data?.info_url || 'https://ethereum.org',
      }
    case 42161:
    case 42170:
    case 421611:
      data = {
        ...data,
        info_url: data?.info_url || 'https://arbitrum.io',
      }
    case 10:
      data = {
        ...data,
        info_url: data?.info_url || 'https://optimism.io',
      }
    case 3:
      data = {
        ...data,
        info_url: data?.info_url || 'https://ethereum.org',
      }
    case 4:
      data = {
        ...data,
        info_url: data?.info_url || 'https://rinkeby.io',
      }
    case 5:
      data = {
        ...data,
        info_url: data?.info_url || 'https://goerli.net',
      }
    case 42:
      data = {
        ...data,
        info_url: data?.info_url || 'https://kovan-testnet.github.io/website',
      }
    case 69:
      data = {
        ...data,
        coingecko_id: 'ethereum',
      }
      break
    case 56:
    case 97:
      data = {
        info_url: 'https://bnbchain.world',
        coingecko_id: 'binancecoin',
      }
      break
    case 137:
    case 80001:
      data = {
        info_url: 'https://polygon.technology',
        coingecko_id: 'matic-network',
      }
      break
    case 43114:
      data = {
        info_url: 'https://avax.network',
        coingecko_id: 'avalanche-2',
      }
      break
    case 250:
      data = {
        info_url: 'https://fantom.foundation',
        coingecko_id: 'fantom',
      }
      break
    case 100:
      data = {
        info_url: 'https://gnosischain.com',
        coingecko_id: 'gnosis',
      }
      break
    case 1284:
    case 1287:
      data = {
        info_url: 'https://moonbeam.network',
        coingecko_id: 'moonbeam',
      }
      break
    case 1285:
      data = {
        info_url: 'https://moonbeam.network/networks/moonriver',
        coingecko_id: 'moonriver',
      }
      break
    case 122:
      data = {
        info_url: 'https://fuse.io',
        coingecko_id: 'fuse-network-token',
      }
      break
    case 2001:
      data = {
        info_url: 'https://milkomeda.com',
        coingecko_id: 'cardano',
      }
      break
    case 288:
      data = {
        info_url: 'https://boba.network',
        coingecko_id: 'boba-network',
      }
      break
    case 1666600000:
      data = {
        info_url: 'https://harmony.one',
        coingecko_id: 'harmony',
      }
      break
    case 192837465:
      data = {
        info_url: 'https://gather.network',
        coingecko_id: 'gather',
      }
      break
    case 2221:
      data = {
        info_url: 'https://kava.io',
        coingecko_id: 'kava',
      }
      break
    case 25:
      data = {
        info_url: 'https://crypto.com',
        coingecko_id: 'crypto-com-chain',
      }
      break
    case 9001:
      data = {
        info_url: 'https://evmos.org',
        coingecko_id: 'evmos',
      }
      break
    default:
      data = {
        info_url: 'https://connext.network',
        coingecko_id: 'connext',
      }
      break
  }

  return data
}