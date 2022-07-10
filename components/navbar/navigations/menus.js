import { RiBarChartBoxLine, RiServerLine, RiCodeFill } from 'react-icons/ri'
import { BiFileBlank } from 'react-icons/bi'

export default [
  {
    id: 'overview',
    title: 'Overview',
    path: '/',
    icon: <RiBarChartBoxLine size={20} className="stroke-current" />,
  },
  {
    id: 'transfers',
    title: 'Transfers',
    path: '/transfers',
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
    icon: <RiCodeFill size={20} className="stroke-current" />,
  },
]