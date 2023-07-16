import { useState, useEffect } from 'react'

import Dashboard from '../components/dashboard'

export default () => {
  const [ssr, setSsr] = useState(true)
  useEffect(() => setSsr(false), [])
  return !ssr && <Dashboard />
}