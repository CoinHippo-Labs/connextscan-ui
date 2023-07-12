import { RiBarChartBoxLine, RiServerLine, RiCopperCoinLine } from 'react-icons/ri'
import { BiFileBlank } from 'react-icons/bi'
import { CgArrowRightR } from 'react-icons/cg'
import { HiSwitchVertical } from 'react-icons/hi'

import { toArray } from '../../../lib/utils'

export default toArray([
  {
    id: 'overview',
    title: 'Overview',
    path: '/',
    icon: <RiBarChartBoxLine size={20} className="3xl:w-6 3xl:h-6" />,
  },
  {
    id: 'transfers',
    title: 'Transfers',
    path: '/transfers',
    icon: <BiFileBlank size={20} className="3xl:w-6 3xl:h-6" />,
  },
  {
    id: 'routers',
    title: 'Routers',
    path: '/routers',
    icon: <RiServerLine size={20} className="3xl:w-6 3xl:h-6" />,
  },
  {
    id: 'bridge',
    title: 'Bridge',
    path: process.env.NEXT_PUBLIC_BRIDGE_URL,
    icon: <CgArrowRightR size={20} className="3xl:w-6 3xl:h-6" />,
  },
  {
    id: 'pool',
    title: 'Pools',
    path: `${process.env.NEXT_PUBLIC_BRIDGE_URL}/pools`,
    icon: <RiCopperCoinLine size={20} className="3xl:w-6 3xl:h-6" />,
  },
  {
    id: 'swap',
    title: 'Swap',
    path: `${process.env.NEXT_PUBLIC_BRIDGE_URL}/swap`,
    icon: <HiSwitchVertical size={20} className="3xl:w-6 3xl:h-6" />,
  },
])