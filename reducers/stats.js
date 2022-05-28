import { STATS_DATA } from './types'

export default (
  state = {
    [`${STATS_DATA}`]: null,
  },
  action
) => {
  switch (action.type) {
    case STATS_DATA:
      return {
        ...state,
        [`${STATS_DATA}`]: action.value ? { ...state[`${STATS_DATA}`], ...action.value } : null,
      }
    default:
      return state
  }
}