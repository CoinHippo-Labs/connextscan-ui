import numeral from 'numeral'
import moment from 'moment'

const remove_decimal = number => {
  if (typeof number === 'number') {
    number = number.toString()
  }
  if (number.includes('NaN')) {
    return number.replace('NaN', '<0.00000001')
  }
  if (typeof number === 'string') {
    if (number.indexOf('.') > -1) {
      let decimal = number.substring(number.indexOf('.') + 1)
      while (decimal.endsWith('0')) {
        decimal = decimal.substring(0, decimal.length - 1)
      }
      if (number.substring(0, number.indexOf('.')).length >= 7 && decimal.length > 2 && !isNaN(`0.${decimal}`)) {
        decimal = Number(`0.${decimal}`).toFixed(2).toString()
        if (decimal.indexOf('.') > -1) {
          decimal = decimal.substring(decimal.indexOf('.') + 1)
          while (decimal.endsWith('0')) {
            decimal = decimal.substring(0, decimal.length - 1)
          }
        }
      }
      return `${number.substring(0, number.indexOf('.'))}${decimal ? '.' : ''}${decimal}`
    }
    return number
  }
  return ''
}
export const number_format = (number, format, is_exact) => {
  let string = remove_decimal(numeral(number).format(format.includes('.000') && Math.abs(Number(number)) >= 1.01 ? `${format.substring(0, format.indexOf('.') + (is_exact ? 7 : 3))}` : format === '0,0' && Number(number) < 1 ? '0,0.00' : format))
  if (string?.toLowerCase().endsWith('t') && string.split(',').length > 1) {
    string = numeral(number).format('0,0e+0')
  }
  return string
}

const names = {
  btc: 'Bitcoin',
  eth: 'Ethereum',
}
const capitalize = s => typeof s !== 'string' ? '' : s.trim().split(' ').join('_').split('-').join('_').split('_').map(x => x.trim()).filter(x => x).map(x => `${x.substr(0, 1).toUpperCase()}${x.substr(1)}`).join(' ')
export const name = (s, data) => names[s] ? names[s] : data?.name && data.id === s ? data.name : s && s.length <= 3 ? s.toUpperCase() : capitalize(s)
export const ellipse = (string, length = 10) => !string ? '' : string.length < (length * 2) + 3 ? string : `${string.slice(0, length)}...${string.slice(-length)}`

export const equals_ignore_case = (a, b) => (!a && !b) || a?.toLowerCase() === b?.toLowerCase()
export const total_time_string = (a, b) => {
  if (!(a && b)) return null
  a = a * 1000
  b = b * 1000
  const total_time = moment(b).diff(moment(a), 'seconds')
  return total_time < 60 ?
  `${total_time}s` : total_time < 60 * 60 ?
  `${Math.floor(total_time / 60)} min${total_time % 60 > 0 ? ` ${total_time % 60}s` : ''}` : total_time < 24 * 60 * 60 ?
  moment.utc(total_time * 1000).format('HH:mm:ss') : `${moment(b).diff(moment(a), 'days')} day`
}

export const to_json = s => {
  if (s) {
    if (typeof s === 'object') return s
    try {
      return JSON.parse(s)
    } catch (error) {}
  }
  return null
}

export const loader_color = theme => theme === 'dark' ? 'white' : '#3b82f6'