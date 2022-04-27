import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import assets from './assets'
import ens from './ens'
import chain from './chain'
import chains_status from './chains-status'
import routers_status from './routers-status'
import asset_balances from './asset-balances'
import routers_assets from './routers-assets'
import stats from './stats'
import transactions from './transactions'
import dev from './dev'
import rpc_providers from './rpc-providers'

export default combineReducers({
  preferences,
  chains,
  assets,
  ens,
  chain,
  chains_status,
  routers_status,
  asset_balances,
  routers_assets,
  stats,
  transactions,
  dev,
  rpc_providers,
})