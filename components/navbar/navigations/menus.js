import { RiBarChartBoxLine, RiServerLine, RiCodeFill, RiCopperCoinLine } from 'react-icons/ri'
import { BiFileBlank } from 'react-icons/bi'
import { MdSwapHoriz } from 'react-icons/md'

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
  {
    id: 'pool',
    title: 'Pools',
    path: `${process.env.NEXT_PUBLIC_BRIDGE_URL}/pools`,
    external: true,
    icon: <RiCopperCoinLine size={20} className="stroke-current" />,
  },
  {
    id: 'swap',
    title: 'Swap',
    path: `${process.env.NEXT_PUBLIC_BRIDGE_URL}/swap`,
    external: true,
    icon: <MdSwapHoriz size={20} className="stroke-current" />,
  },
]