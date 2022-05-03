import { combineReducers } from 'redux'

import preferences from './preferences'
import chains from './chains'
import assets from './assets'
import ens from './ens'
import chain from './chain'
import chains_status from './chains-status'
import asset_balances from './asset-balances'
import stats from './stats'
import transactions from './transactions'
import dev from './dev'
import rpc_providers from './rpc-providers'
import wallet from './wallet'
import chain_id from './chain-id'

export default combineReducers({
  preferences,
  chains,
  assets,
  ens,
  chain,
  chains_status,
  asset_balances,
  stats,
  transactions,
  dev,
  rpc_providers,
  wallet,
  chain_id,
})