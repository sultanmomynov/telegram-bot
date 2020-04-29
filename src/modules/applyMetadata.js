const ffmetadata = require('ffmetadata')

module.exports = function applyMetadata(path, metadata, options) {
  return new Promise((resolve, reject) => {
    ffmetadata.write(path, metadata, options, (err) => {
      if (err) reject(err)
      resolve()
    })
  })
}
