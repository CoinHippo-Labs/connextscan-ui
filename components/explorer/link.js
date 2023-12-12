import { constants } from 'ethers'
const { AddressZero: ZeroAddress } = { ...constants }

import Image from '../image'
import { getKeyType } from '../../lib/key'

export default (
  {
    value,
    explorer,
    _url,
    hasEventLog,
    type = 'tx',
    width = 16,
    height = 16,
    iconOnly = true,
    viewOnClassName = 'font-semibold',
    className = 'rounded-full opacity-60 hover:opacity-100',
  },
) => {
  const { url, name, address_path, contract_path, contract_0_path, transaction_path, icon } = { ...explorer }

  let path
  let field
  if (type === 'tx') {
    if (getKeyType(value) === 'address') {
      type = 'address'
    }
  }
  switch (type) {
    case 'contract':
      field = 'address'
      break
    default:
      field = type
      break
  }
  switch (type) {
    case 'address':
      path = address_path
      break
    case 'contract':
      path = value === ZeroAddress ? contract_0_path : contract_path
      break
    case 'tx':
      path = transaction_path
      break
    default:
      break
  }

  return (_url || (value && url)) && (
    <a
      href={_url || `${url}${path?.replace(`{${field}}`, value)}${type == 'tx' && hasEventLog ? '#eventlog' : ''}`}
      target="_blank"
      rel="noopener noreferrer"
      className="min-w-max flex items-center space-x-1"
    >
      {!iconOnly && (
        <span className={viewOnClassName}>
          View on {name}
        </span>
      )}
      <Image
        src={icon}
        width={width}
        height={height}
        className={className}
      />
    </a>
  )
}