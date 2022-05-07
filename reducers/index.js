import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import assets from './assets'
import ens from './ens'
import chain from './chain'
import asset_balances from './asset-balances'
import stats from './stats'
import transactions from './transactions'
import rpc_providers from './rpc-providers'
import dev from './dev'
import wallet from './wallet'
import chain_id from './chain-id'

export default combineReducers({
  preferences,
  chains,
  assets,
  ens,
  chain,
  asset_balances,
  stats,
  transactions,
  rpc_providers,
  dev,
  wallet,
  chain_id,
})