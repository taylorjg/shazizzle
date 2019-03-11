/* eslint-env node */
/* eslint-disable no-console */

const R = require('ramda')

const configureService = db => {

  const trackMetadata = db.collection('track-metadata')
  const trackHashes = db.collection('track-hashes')

  const match = async hashes => {
    console.log(`[matchService#match] hashes.length: ${hashes.length}`)

    const promises = hashes.map(([tuple, t1Sample]) =>
      trackHashes.find({ tuple }).toArray().then(records => ({
        records,
        t1Sample
      })))
    const resolved = await Promise.all(promises)
    const flattened = R.chain(({ records, t1Sample }) => records.map(record => ({ record, t1Sample })), resolved)
    const grouped = R.groupBy(({ record }) => record.trackMetadataId.toString(), flattened)
    Array.from(Object.entries(grouped)).forEach(([key, value]) => {
      console.log(`key: ${key}; value.length: ${value.length}`)
      const grouped = R.groupBy(({ record, t1Sample }) => record.t1 - t1Sample, value)
      const sorted = R.pipe(
        R.toPairs,
        R.map(([k, v]) => [k, v.length]),
        R.sort(R.descend(([, v]) => v)),
        R.take(5)
      )(grouped)
      console.dir(sorted)
    })
    return null
  }

  const service = {
    match
  }

  return service
}

module.exports = configureService
