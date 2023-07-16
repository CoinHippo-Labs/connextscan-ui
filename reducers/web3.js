import { WEB3_CHAIN_ID } from './types'

export default (
  state = {
    [WEB3_CHAIN_ID]: null,
  },
  action,
) => {
  switch (action.type) {
    case WEB3_CHAIN_ID:
      return {
        ...state,
        [WEB3_CHAIN_ID]: action.value,
      }
    default:
      return state
  }
}