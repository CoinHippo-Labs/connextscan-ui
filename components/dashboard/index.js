import TvlTotal from './tvl/total'
import Tvl from './tvl'

export default () => {
  return (
    <div className="grid lg:grid-cols-4 gap-4 mt-2 mb-6 mx-auto">
      <TvlTotal />
      <div className="lg:col-span-3">
        <Tvl />
      </div>
    </div>
  )
}