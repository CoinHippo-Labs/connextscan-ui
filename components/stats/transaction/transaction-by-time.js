import { useRouter } from 'next/router'
import { useSelector, shallowEqual } from 'react-redux'

import {
  ResponsiveContainer,
  BarChart,
  linearGradient,
  stop,
  XAxis,
  Bar,
  Cell,
} from 'recharts'
import { Oval } from 'react-loader-spinner'

export default function TransactionByTime({ data, selectTime }) {
  const { preferences } = useSelector(state => ({ preferences: state.preferences }), shallowEqual)
  const { theme } = { ...preferences }

  const router = useRouter()
  const { query } = { ...router }
  const { blockchain_id } = { ...query }

  const loaded = !!data

  return (
    <div className="w-full h-60">
      {loaded ?
        <ResponsiveContainer>
          <BarChart
            data={data}
            onMouseEnter={event => {
              if (event) {
                if (selectTime) {
                  selectTime(event?.activePayload?.[0]?.payload?.time)
                }
              }
            }}
            onMouseMove={event => {
              if (event) {
                if (selectTime) {
                  selectTime(event?.activePayload?.[0]?.payload?.time)
                }
              }
            }}
            onMouseLeave={() => {
              if (event) {
                if (selectTime) {
                  selectTime(null)
                }
              }
            }}
            margin={{ top: 10, right: 10, left: 10, bottom: -8 }}
            className={`mobile-hidden-x ${data.length > 10 ? 'small-x' : ''}`}
          >
            <defs>
              <linearGradient id="gradient-tx" x1="0" y1="0" x2="0" y2="1">
                <stop offset="50%" stopColor="#60A5FA" stopOpacity={0.95} />
                <stop offset="100%" stopColor="#60A5FA" stopOpacity={0.75} />
              </linearGradient>
            </defs>
            <XAxis dataKey="time_string" axisLine={false} tickLine={false} />
            <Bar dataKey={blockchain_id ? 'totalTxCount' : 'receivingTxCount'} minPointSize={5}>
              {data.map((entry, i) => (<Cell key={i} fillOpacity={1} fill="url(#gradient-tx)" />))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
        :
        <div className="w-full h-56 flex items-center justify-center">
          <Oval color={theme === 'dark' ? 'white' : '#3B82F6'} width="24" height="24" />
        </div>
      }
    </div>
  )
}