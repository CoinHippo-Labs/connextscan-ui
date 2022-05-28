import { RiBarChartBoxLine, RiServerLine } from 'react-icons/ri'
import { BiFileBlank, BiTransfer } from 'react-icons/bi'

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
    icon: <RiServerLine size={20} className="stroke-current" />,
  },
  {
    id: 'bridge',
    title: 'Bridge',
    path: process.env.NEXT_PUBLIC_BRIDGE_URL,
    external: true,
    icon: <BiTransfer size={20} className="stroke-current" />,
  },
]