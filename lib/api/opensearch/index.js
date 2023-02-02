import _ from 'lodash'

// import { getRequestUrl } from '../../utils'

const request = async (path, params) => {
  // const res = await fetch(getRequestUrl(process.env.NEXT_PUBLIC_INDEXER_URL, path, { ...params }))
  params = { ...params, path }

  const res = await fetch(process.env.NEXT_PUBLIC_INDEXER_URL, {
    method: 'POST',
    body: JSON.stringify(params),
  }).catch(error => { return null })
  return res && await res.json()
}

const objectToString = object => object ? typeof object === 'object' ? JSON.stringify(object) : object : undefined

export const dayMetrics = async params => {
  const index = `day_metrics${['testnet'].includes(process.env.NEXT_PUBLIC_NETWORK) ? `_${process.env.NEXT_PUBLIC_NETWORK}` : ''}`
  const path = `/${index}/_search`

  params = {
    size: 0,
    ...params,
    index,
    method: 'search',
    aggs: objectToString(params.aggs),
    query: objectToString(params.query),
    sort: objectToString(params.sort),
    fields: objectToString(params.fields),
  }

  let response = await request(path, params)

  if (response?.aggregations?.chains?.buckets) {
    response = {
      data: Object.fromEntries(response.aggregations.chains.buckets.map(c => {
        const records = c?.day_metrics?.buckets?.map(day => {
          return {
            id: `${c?.key}_${day?.key}`,
            chain_id: Number(c?.key),
            dayStartTimestamp: day?.key,
            sendingTxCount: day?.sending_txs?.value,
            receivingTxCount: day?.receiving_txs?.value,
            cancelTxCount: day?.cancel_txs?.value,
            volume_value: day?.volume_values?.value,
            volumeIn_value: day?.volume_in_values?.value,
            relayerFee_value: day?.relayer_fee_values?.value,
            version: _.head(day?.versions?.buckets?.filter(v => v?.key))?.key,
            tokens: day?.assets?.buckets?.map(a => {
              return {
                id: `${c?.key}_${a?.key}`,
                chain_id: Number(c?.key),
                dayStartTimestamp: day?.key,
                sendingTxCount: a?.sending_txs?.value,
                receivingTxCount: a?.receiving_txs?.value,
                cancelTxCount: a?.cancel_txs?.value,
                volume_value: a?.volume_values?.value,
                volumeIn_value: a?.volume_in_values?.value,
                relayerFee_value: a?.relayer_fee_values?.value,
                version: _.head(a?.versions?.buckets?.filter(v => v?.key))?.key,
              }
            })
          }
        })

        return [c?.key, records]
      })),
      total: response.hits?.total?.value,
    }
  }

  return response
}