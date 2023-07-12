import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import assets from './assets'
import pool_assets from './pool-assets'
import gas_tokens_price from './gas-tokens-price'
import ens from './ens'
import router_asset_balances from './router-asset-balances'
import pools from './pools'
import rpc_providers from './rpc-providers'
import dev from './dev'
import wallet from './wallet'
import web3 from './web3'
import latest_bumped_transfers from './latest-bumped-transfers'

export default combineReducers({
  preferences,
  chains,
  assets,
  pool_assets,
  gas_tokens_price,
  ens,
  router_asset_balances,
  pools,
  rpc_providers,
  dev,
  wallet,
  web3,
  latest_bumped_transfers,
})