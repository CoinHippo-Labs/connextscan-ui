import _ from 'lodash'

export default ({
  alt = '',
  ...rest
}) => {
  const {
    src,
  } = { ...rest }

  return (
    <img
      alt={alt}
      { ...rest }
      src={Array.isArray(src) ?
        _.head(src) :
        src
      }
    />
  )
}