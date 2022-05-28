import { CHAIN_DATA } from './types'

export default (
  state = {
    [`${CHAIN_DATA}`]: null,
  },
  action
) => {
  switch (action.type) {
    case CHAIN_DATA:
      return {
        ...state,
        [`${CHAIN_DATA}`]: action.value ? { ...state[`${CHAIN_DATA}`], ...action.value } : {},
      }
    default:
      return state
  }
}