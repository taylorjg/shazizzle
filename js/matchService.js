/* eslint-env node */
/* eslint-disable no-console */

const R = require('ramda')
const ObjectID = require('mongodb').ObjectID
const moment = require('moment')

const configureService = db => {

  const trackMetadata = db.collection('track-metadata')
  const trackHashes = db.collection('track-hashes')

  const match = async hashes => {
    const promises = hashes.map(([tuple, t1Sample]) =>
      trackHashes.find({ tuple }).toArray().then(records => ({
        records,
        t1Sample
      })))
    const resolved = await Promise.all(promises)
    const flattened = R.chain(({ records, t1Sample }) => records.map(record => ({ record, t1Sample })), resolved)
    const grouped = R.groupBy(({ record }) => record.trackMetadataId.toString(), flattened)
    const bestGroupsOfHashes = Array.from(Object.entries(grouped)).map(([trackMetadataId, records]) => {
      const grouped = R.groupBy(({ record, t1Sample }) => {
        const t1Track = record.t1
        return t1Track - t1Sample
      }, records)
      const sorted = R.pipe(
        R.toPairs,
        R.map(([deltaTime, records]) => [deltaTime, records.length]),
        R.sort(R.descend(([, count]) => count)),
        R.take(5)
      )(grouped)
      const [deltaTime, count] = R.head(sorted)
      return {
        trackMetadataId,
        seconds: Number(deltaTime) / 20,
        count
      }
    })
    const bestGroupOfHashes = R.head(bestGroupsOfHashes.sort(R.descend(R.prop('count'))))
    const track = await trackMetadata.findOne({ _id: new ObjectID(bestGroupOfHashes.trackMetadataId) })
    const time = moment.utc(bestGroupOfHashes.seconds * 1000).format('m:ss')
    const result = {
      ...track,
      time
    }
    console.log(`result: ${JSON.stringify(result)}`)
    return result
  }

  const service = {
    match
  }

  return service
}

module.exports = configureService
