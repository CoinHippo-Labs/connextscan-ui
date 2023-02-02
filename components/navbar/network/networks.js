import Link from 'next/link'
import { useSelector, shallowEqual } from 'react-redux'

import _ from 'lodash'
import Image from '../../image'
import { chainTitle, connext } from '../../../lib/object/chain'

export default function Networks({ handleDropdownClick }) {
  const { chains } = useSelector(state => ({ chains: state.chains }), shallowEqual)
  const { chains_data } = { ...chains }

  return (
    <>
      <div className="dropdown-title">Select Network</div>
      <div className="flex flex-wrap pb-1">
        {_.concat(connext, chains_data || []).filter(item => !item.menu_hidden).map((item, i) => (
          item.disabled ?
            <div
              key={i}
              title="Disabled"
              className="dropdown-item w-1/2 cursor-not-allowed flex items-center justify-start font-medium space-x-1 p-2"
            >
              <Image
                src={item.image}
                alt=""
                className="w-5 h-5 rounded-full"
              />
              <span className="leading-4 text-2xs font-medium">{chainTitle(item)}</span>
            </div>
            :
            <Link
              key={i}
              href={`/${item.id}`}
            >
              <a
                onClick={handleDropdownClick}
                className="dropdown-item w-1/2 flex items-center justify-start space-x-1 p-2"
              >
                <Image
                  src={item.image}
                  alt=""
                  className="w-5 h-5 rounded-full"
                />
                <span className="leading-4 text-2xs font-medium">{item?.id ? chainTitle(item) : 'All'}</span>
              </a>
            </Link>
        ))}
      </div>
    </>
  )
}