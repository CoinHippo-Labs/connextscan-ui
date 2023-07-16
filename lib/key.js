import _ from 'lodash'

export const getKeyType = key => {
  const regexMap = {
    tx: new RegExp(/^0x([A-Fa-f0-9]{64})$/, 'igm'),
    address: new RegExp(/^0x[a-fA-F0-9]{40}$/, 'igm'),
    ens: new RegExp(/[-a-zA-Z0-9@:%._\+~#=]{1,256}\.[a-zA-Z0-9()]{1,6}\b([-a-zA-Z0-9()@:%_\+.~#?&//=]*)?/, 'igm'),
  }
  return !key ? null : _.head(Object.entries(regexMap).filter(([k, v]) => key.match(v)).map(([k, v]) => k)) || (!isNaN(key) ? 'block' : 'tx')
}