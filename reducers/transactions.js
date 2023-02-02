import { TRANSACTIONS_DATA } from './types'

export default function data(
  state = {
    [`${TRANSACTIONS_DATA}`]: null,
  },
  action
) {
  switch (action.type) {
    case TRANSACTIONS_DATA:
      return {
        ...state,
        [`${TRANSACTIONS_DATA}`]: action.value && { ...state[`${TRANSACTIONS_DATA}`], ...action.value },
      }
    default:
      return state
  }
}