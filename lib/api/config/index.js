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

  const response =
    await fetch(
      process.env.NEXT_PUBLIC_API_URL,
      {
        method: 'POST',
        body: JSON.stringify(params),
      },
    )
    .catch(error => {
      return null
    })

  return (
    response &&
    await response.json()
  )
}

export const chains = async params => {
  const is_staging =
    process.env.NEXT_PUBLIC_ENVIRONMENT === 'staging' ||
    process.env.NEXT_PUBLIC_SITE_URL?.includes('staging')

  params = {
    ...params,
    collection: 'chains',
  }

  // const response =
  //   await request(
  //     null,
  //     params,
  //   )
  const response = {"evm":[{"id":"ethereum","chain_id":1,"domain_id":"6648936","name":"Ethereum","short_name":"ETH","provider_params":[{"chainId":"0x1","chainName":"Ethereum","rpcUrls":["https://mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161","https://rpc.builder0x69.io","https://rpc.ankr.com/eth"],"nativeCurrency":{"name":"Ethereum","symbol":"ETH","decimals":18},"blockExplorerUrls":["https://etherscan.io"]}],"explorer":{"name":"Etherscan","url":"https://etherscan.io","icon":"/logos/explorers/etherscan.png","block_path":"/block/{block}","address_path":"/address/{address}","contract_path":"/token/{address}","contract_0_path":"/address/{address}","transaction_path":"/tx/{tx}"},"image":"/logos/chains/ethereum.png","color":"#636890","website":"https://ethereum.org","coingecko_id":"ethereum"},{"id":"binance","chain_id":56,"domain_id":"6450786","name":"BNB Chain","short_name":"BNB","provider_params":[{"chainId":"0x38","chainName":"BNB Chain","rpcUrls":["https://bsc.blockpi.network/v1/rpc/public","https://rpc-bsc.bnb48.club","https://bsc-mainnet.nodereal.io/v1/64a9df0874fb4a93b9d0a3849de012d3","https://1rpc.io/bnb","https://bscrpc.com","https://rpc.ankr.com/bsc"],"nativeCurrency":{"name":"BNB","symbol":"BNB","decimals":18},"blockExplorerUrls":["https://bscscan.com"]}],"explorer":{"name":"BscScan","url":"https://bscscan.com","icon":"/logos/explorers/bscscan.png","block_path":"/block/{block}","address_path":"/address/{address}","contract_path":"/token/{address}","contract_0_path":"/address/{address}","transaction_path":"/tx/{tx}"},"image":"/logos/chains/binance.png","color":"#e8b30b","website":"https://bnbchain.world","coingecko_id":"binancecoin"},{"id":"polygon","chain_id":137,"domain_id":"1886350457","name":"Polygon","short_name":"MATIC","provider_params":[{"chainId":"0x89","chainName":"Polygon","rpcUrls":["https://polygon-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161","https://matic-mainnet.chainstacklabs.com","https://poly-rpc.gateway.pokt.network","https://polygon.blockpi.network/v1/rpc/public","https://1rpc.io/matic","https://rpc.ankr.com/polygon"],"nativeCurrency":{"name":"Polygon","symbol":"MATIC","decimals":18},"blockExplorerUrls":["https://polygonscan.com"]}],"explorer":{"name":"Polygonscan","url":"https://polygonscan.com","icon":"/logos/explorers/polygonscan.png","block_path":"/block/{block}","address_path":"/address/{address}","contract_path":"/token/{address}","contract_0_path":"/address/{address}","transaction_path":"/tx/{tx}"},"image":"/logos/chains/polygon.png","color":"#8247e5","website":"https://polygon.technology","coingecko_id":"matic-network"},{"id":"optimism","chain_id":10,"domain_id":"1869640809","name":"Optimism","short_name":"OPT","provider_params":[{"chainId":"0xa","chainName":"Optimism","rpcUrls":["https://optimism-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161","https://optimism.blockpi.network/v1/rpc/public","https://1rpc.io/op","https://rpc.ankr.com/optimism"],"nativeCurrency":{"name":"Ethereum","symbol":"oETH","decimals":18},"blockExplorerUrls":["https://optimistic.etherscan.io"]}],"explorer":{"name":"Etherscan","url":"https://optimistic.etherscan.io","icon":"/logos/explorers/optimism.png","block_path":"/block/{block}","address_path":"/address/{address}","contract_path":"/token/{address}","contract_0_path":"/address/{address}","transaction_path":"/tx/{tx}"},"image":"/logos/chains/optimism.png","color":"#dc2626","website":"https://optimism.io","coingecko_id":"optimism"},{"id":"arbitrum","chain_id":42161,"domain_id":"1634886255","name":"Arbitrum One","short_name":"ARB","provider_params":[{"chainId":"0xa4b1","chainName":"Arbitrum One","rpcUrls":["https://arbitrum-mainnet.infura.io/v3/9aa3d95b3bc440fa88ea12eaa4456161","https://arbitrum.blockpi.network/v1/rpc/public","https://arb1.arbitrum.io/rpc","https://1rpc.io/arb","https://rpc.ankr.com/arbitrum"],"nativeCurrency":{"name":"Ethereum","symbol":"aETH","decimals":18},"blockExplorerUrls":["https://arbiscan.io"]}],"explorer":{"name":"Arbiscan","url":"https://arbiscan.io","icon":"/logos/explorers/arbiscan.png","block_path":"/block/{block}","address_path":"/address/{address}","contract_path":"/token/{address}","contract_0_path":"/address/{address}","transaction_path":"/tx/{tx}"},"image":"/logos/chains/arbitrum.png","color":"#28a0f0","website":"https://arbitrum.io","coingecko_id":"arbitrum"},{"id":"gnosis","chain_id":100,"domain_id":"6778479","name":"Gnosis","short_name":"GNO","provider_params":[{"chainId":"0x64","chainName":"Gnosis","rpcUrls":["https://xdai-rpc.gateway.pokt.network","https://gnosischain-rpc.gateway.pokt.network","https://gnosis.blockpi.network/v1/rpc/public","https://rpc.gnosis.gateway.fm","https://rpc.ankr.com/gnosis"],"nativeCurrency":{"name":"xDAI","symbol":"xDAI","decimals":18},"blockExplorerUrls":["https://gnosisscan.io"]}],"explorer":{"name":"Gnosisscan","url":"https://gnosisscan.io","icon":"/logos/explorers/gnosisscan.png","block_path":"/block/{block}","address_path":"/address/{address}","contract_path":"/token/{address}","contract_0_path":"/address/{address}","transaction_path":"/tx/{tx}"},"image":"/logos/chains/gnosis.png","color":"#48a9a6","website":"https://gnosischain.com","coingecko_id":"gnosis"}]}

  const {
    evm,
  } = { ...response }

  return {
    ...response,
    evm:
      (evm || [])
        .filter(c =>
          !c?.is_staging ||
          is_staging
        )
        .map(c => {
          const {
            hostname,
          } = {
            ...(
              typeof window !== 'undefined' ?
                window.location :
                null
            ),
          }

          if (!process.env.NEXT_PUBLIC_SITE_URL?.includes(hostname)) {
            delete c.rpc_urls
          }

          return {
            ...c,
          }
        }),
  }
}

export const assets = async params =>
  [{"id":"usdc","symbol":"USDC","name":"USD Coin","image":"/logos/assets/usdc.png","coingecko_id":"usd-coin","is_stablecoin":true,"contracts":[{"contract_address":"0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48","chain_id":1,"decimals":6,"symbol":"USDC"},{"contract_address":"0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d","chain_id":56,"decimals":18,"symbol":"USDC","next_asset":{"contract_address":"0x5e7D83dA751F4C9694b13aF351B30aC108f32C38","decimals":6,"symbol":"nextUSDC","image":"/logos/assets/nextusdc.png"},"is_pool":true},{"contract_address":"0x2791Bca1f2de4661ED88A30C99A7a9449Aa84174","chain_id":137,"decimals":6,"symbol":"USDC","next_asset":{"contract_address":"0xF96C6d2537e1af1a9503852eB2A4AF264272a5B6","decimals":6,"symbol":"nextUSDC","image":"/logos/assets/nextusdc.png"},"is_pool":true},{"contract_address":"0x7F5c764cBc14f9669B88837ca1490cCa17c31607","chain_id":10,"decimals":6,"symbol":"USDC","next_asset":{"contract_address":"0x67E51f46e8e14D4E4cab9dF48c59ad8F512486DD","decimals":6,"symbol":"nextUSDC","image":"/logos/assets/nextusdc.png"},"is_pool":true},{"contract_address":"0xFF970A61A04b1cA14834A43f5dE4533eBDDB5CC8","chain_id":42161,"decimals":6,"symbol":"USDC","next_asset":{"contract_address":"0x8c556cF37faa0eeDAC7aE665f1Bb0FbD4b2eae36","decimals":6,"symbol":"nextUSDC","image":"/logos/assets/nextusdc.png"},"is_pool":true},{"contract_address":"0xDDAfbb505ad214D7b80b1f830fcCc89B60fb7A83","chain_id":100,"decimals":6,"symbol":"USDC","next_asset":{"contract_address":"0x44CF74238d840a5fEBB0eAa089D05b763B73faB8","decimals":6,"symbol":"nextUSDC","image":"/logos/assets/nextusdc.png"},"is_pool":true}]},{"id":"eth","symbol":"ETH","name":"Ethereum","image":"/logos/assets/eth.png","coingecko_id":"weth","contracts":[{"contract_address":"0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2","chain_id":1,"decimals":18,"symbol":"WETH","image":"/logos/assets/weth.png"},{"contract_address":"0x2170Ed0880ac9A755fd29B2688956BD959F933F8","chain_id":56,"decimals":18,"symbol":"WETH","image":"/logos/assets/weth.png","next_asset":{"contract_address":"0xA9CB51C666D2AF451d87442Be50747B31BB7d805","decimals":18,"symbol":"nextWETH","image":"/logos/assets/nextweth.png"},"is_pool":true},{"contract_address":"0x7ceB23fD6bC0adD59E62ac25578270cFf1b9f619","chain_id":137,"decimals":18,"symbol":"WETH","image":"/logos/assets/weth.png","next_asset":{"contract_address":"0x4b8BaC8Dd1CAA52E32C07755c17eFadeD6A0bbD0","decimals":18,"symbol":"nextWETH","image":"/logos/assets/nextweth.png"},"is_pool":true},{"contract_address":"0x4200000000000000000000000000000000000006","chain_id":10,"decimals":18,"symbol":"WETH","image":"/logos/assets/weth.png","next_asset":{"contract_address":"0xbAD5B3c68F855EaEcE68203312Fd88AD3D365e50","decimals":18,"symbol":"nextWETH","image":"/logos/assets/nextweth.png"},"is_pool":true},{"contract_address":"0x82aF49447D8a07e3bd95BD0d56f35241523fBab1","chain_id":42161,"decimals":18,"symbol":"WETH","image":"/logos/assets/weth.png","next_asset":{"contract_address":"0x2983bf5c334743Aa6657AD70A55041d720d225dB","decimals":18,"symbol":"nextWETH","image":"/logos/assets/nextweth.png"},"is_pool":true},{"contract_address":"0x6A023CCd1ff6F2045C3309768eAd9E68F978f6e1","chain_id":100,"decimals":18,"symbol":"WETH","image":"/logos/assets/weth.png","next_asset":{"contract_address":"0x538E2dDbfDf476D24cCb1477A518A82C9EA81326","decimals":18,"symbol":"nextWETH","image":"/logos/assets/nextweth.png"},"is_pool":true}]},{"id":"kp3r","symbol":"KP3R","name":"Keep3rV1","image":"/logos/assets/kp3r.png","coingecko_id":"keep3rv1","contracts":[{"contract_address":"0x1cEB5cB57C4D4E2b2433641b95Dd330A33185A44","chain_id":1,"decimals":18,"symbol":"KP3R"},{"contract_address":"0xB3de3929C3bE8a1Fa446f27d1b549Dd9d5C313E0","chain_id":56,"decimals":18,"symbol":"KP3R","image":"/logos/assets/kp3r.png","next_asset":{"contract_address":"0x2aa48B3d6EFe651542D22CEF0CB7ea853D97A850","decimals":18,"symbol":"nextKP3R","image":"/logos/assets/nextkp3r.png"}},{"contract_address":"0x725dB429F0ff5A3DF5f41fcA8676CF9Dd1C6b3F0","chain_id":137,"decimals":18,"symbol":"KP3R","image":"/logos/assets/kp3r.png","next_asset":{"contract_address":"0x4a2bE2075588BcE6A7E072574698a7DbbAc39b08","decimals":18,"symbol":"nextKP3R","image":"/logos/assets/nextkp3r.png"}},{"contract_address":"0xa83ad51c99bb40995f9292c9a436046ab7578caf","chain_id":10,"decimals":18,"symbol":"KP3R","image":"/logos/assets/kp3r.png","next_asset":{"contract_address":"0xca87472DBfB041c2e5a2672d319eA6184Ad9755e","decimals":18,"symbol":"nextKP3R","image":"/logos/assets/nextkp3r.png"}},{"contract_address":"0xA83ad51C99BB40995F9292C9a436046ab7578cAF","chain_id":100,"decimals":18,"symbol":"KP3R","image":"/logos/assets/kp3r.png","next_asset":{"contract_address":"0x398bB7642BD0A5c7CB64f6255159BFABa5512342","decimals":18,"symbol":"nextKP3R","image":"/logos/assets/nextkp3r.png"}}]},{"id":"kp3r-lp","symbol":"KLP","name":"Keep3rLP","image":"/logos/assets/kp3r.png","coingecko_id":"ethereum","contracts":[{"contract_address":"0x3f6740b5898c5D3650ec6eAce9a649Ac791e44D7","chain_id":1,"decimals":18,"symbol":"KLP"},{"contract_address":"0xf813835326f1c606892a36F96b6Cdd18D6d87De9","chain_id":56,"decimals":18,"symbol":"KLP","image":"/logos/assets/kp3r.png","next_asset":{"contract_address":"0xd00D9EE9238687A2041004Fe9D55a2299e0Af2fa","decimals":18,"symbol":"nextKLP","image":"/logos/assets/nextkp3r.png"}},{"contract_address":"0x381BC51bb203c5940A398622be918C876cB0f035","chain_id":137,"decimals":18,"symbol":"KLP","image":"/logos/assets/kp3r.png","next_asset":{"contract_address":"0x7cf93c434260519537184631A347eE8AD0Bc68Cb","decimals":18,"symbol":"nextKLP","image":"/logos/assets/nextkp3r.png"}},{"contract_address":"0x87A93A942D10B6cC061A952C3A1213d52044bE97","chain_id":10,"decimals":18,"symbol":"KLP","image":"/logos/assets/kp3r.png","next_asset":{"contract_address":"0xf232D1Afbed9Df3880143d4FAD095f3698c4d1c6","decimals":18,"symbol":"nextKLP","image":"/logos/assets/nextkp3r.png"}},{"contract_address":"0x87A93A942D10B6cC061A952C3A1213d52044bE97","chain_id":100,"decimals":18,"symbol":"KLP","image":"/logos/assets/kp3r.png","next_asset":{"contract_address":"0x386508A233EE1494d31555Ab8aa2df6D6DC76E61","decimals":18,"symbol":"nextKLP","image":"/logos/assets/nextkp3r.png"}}]}]
  // await request(
  //   null,
  //   {
  //     ...params,
  //     collection: 'assets',
  //   },
  // )