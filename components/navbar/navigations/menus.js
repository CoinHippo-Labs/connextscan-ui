import { RiBarChartBoxLine } from 'react-icons/ri'
import { BiFileBlank, BiHeartCircle, BiTransfer } from 'react-icons/bi'
import { MdOutlineRouter, MdOutlineTableChart } from 'react-icons/md'

export default [
  {
    id: 'overview',
    title: 'Overview',
    path: '/',
    icon: <RiBarChartBoxLine size={20} className="stroke-current" />,
  },
  {
    id: 'transactions',
    title: 'Transactions',
    path: '/transactions',
    icon: <BiFileBlank size={20} className="stroke-current" />,
  },
  {
    id: 'routers',
    title: 'Routers',
    path: '/routers',
    icon: <MdOutlineRouter size={20} className="stroke-current" />,
  },
  {
    id: 'leaderboard-routers',
    title: 'Leaderboard',
    path: '/leaderboard/routers',
    icon: <MdOutlineTableChart size={20} className="stroke-current" />,
  },
  {
    id: 'status',
    title: 'Status',
    path: '/status',
    icon: <BiHeartCircle size={20} className="stroke-current" />,
  },
  {
    id: 'bridge',
    title: 'Bridge',
    path: process.env.NEXT_PUBLIC_BRIDGE_URL,
    external: true,
    icon: <BiTransfer size={20} className="stroke-current" />,
  },
]