import { RiBarChartBoxLine } from 'react-icons/ri'
import { MdOutlineRouter, MdOutlineTableChart } from 'react-icons/md'
import { BiFileBlank, BiHeartCircle } from 'react-icons/bi'

export const navigations = [
  {
    id: 'overview',
    title: 'Overview',
    path: '/',
    icon: <RiBarChartBoxLine size={16} className="stroke-current" />,
  },
  {
    id: 'routers',
    title: 'Routers',
    path: '/routers',
    icon: <MdOutlineRouter size={16} className="stroke-current mb-0.5" />,
  },
  {
    id: 'leaderboard-routers',
    title: 'Leaderboard',
    path: '/leaderboard/routers',
    icon: <MdOutlineTableChart size={16} className="stroke-current" />,
  },
  {
    id: 'transactions',
    title: 'Transactions',
    path: '/transactions',
    icon: <BiFileBlank size={16} className="stroke-current" />,
  },
  {
    id: 'status',
    title: 'Status',
    path: '/status',
    icon: <BiHeartCircle size={16} className="stroke-current" />,
  },
]