import { RiBarChartBoxLine, RiServerLine, RiCopperCoinLine } from 'react-icons/ri'
import { BiFileBlank } from 'react-icons/bi'
import { CgArrowRightR } from 'react-icons/cg'
import { HiSwitchHorizontal } from 'react-icons/hi'

export default [
  {
    id: 'overview',
    title: 'Overview',
    path: '/',
    icon: (
      <RiBarChartBoxLine
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'transfers',
    title: 'Transfers',
    path: '/transfers',
    icon: (
      <BiFileBlank
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'routers',
    title: 'Routers',
    path: '/routers',
    icon: (
      <RiServerLine
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'bridge',
    title: 'Bridge',
    path: process.env.NEXT_PUBLIC_BRIDGE_URL,
    external: true,
    icon: (
      <CgArrowRightR
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'pool',
    title: 'Pools',
    // path: `${process.env.NEXT_PUBLIC_BRIDGE_URL}/pools`,
    path: `${process.env.NEXT_PUBLIC_BRIDGE_URL}/pool`,
    external: true,
    icon: (
      <RiCopperCoinLine
        size={20}
        className="stroke-current"
      />
    ),
  },
  {
    id: 'swap',
    title: 'Swap',
    path: `${process.env.NEXT_PUBLIC_BRIDGE_URL}/swap`,
    external: true,
    icon: (
      <HiSwitchHorizontal
        size={20}
        className="stroke-current"
      />
    ),
  },
]