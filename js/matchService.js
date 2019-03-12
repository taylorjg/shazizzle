/* eslint-env node */
/* eslint-disable no-console */

const R = require('ramda')
const ObjectID = require('mongodb').ObjectID
const moment = require('moment')

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
    const bests = Array.from(Object.entries(grouped)).map(([trackMetadataId, records]) => {
      const grouped = R.groupBy(({ record, t1Sample }) => record.t1 - t1Sample, records)
      const sorted = R.pipe(
        R.toPairs,
        R.map(([k, v]) => [k, v.length]),
        R.sort(R.descend(([, v]) => v)),
        R.take(5)
      )(grouped)
      const head = R.head(sorted)
      return {
        trackMetadataId,
        seconds: Number(head[0]) / 20,
        count: head[1]
      }
    })
    const best = R.head(bests.sort(R.descend(obj => obj.count)))
    const track = await trackMetadata.findOne({ _id: new ObjectID(best.trackMetadataId) })
    console.log(`track: ${JSON.stringify(track)}; seconds: ${moment.utc(best.seconds * 1000).format('m:ss')}`)
    return track
  }

  const service = {
    match
  }

  return service
}

module.exports = configureService
