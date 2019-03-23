const R = require('ramda')
const moment = require('moment')
const { performance } = require('perf_hooks')

const configureService = db => {

  const match = async hashes => {
    const promises = hashes.map(async ([tuple, t1Sample]) => {
      const records = await db.findTuple(tuple)
      return { records, t1Sample }
    })
    const time1 = performance.now()
    const resolved = await Promise.all(promises)
    const time2 = performance.now()
    console.log(`[match] searching: ${time2 - time1}`)
    const flattened = R.chain(({ records, t1Sample }) => records.map(record => ({ record, t1Sample })), resolved)
    const time3 = performance.now()
    console.log(`[match] flattening: ${time3 - time2}`)
    const grouped = R.groupBy(({ record }) => record.trackMetadataId.toString(), flattened)
    const time4 = performance.now()
    console.log(`[match] grouping by track: ${time4 - time3}`)
    const bestGroupsOfHashes = Array.from(Object.entries(grouped)).map(([trackMetadataId, records]) => {
      const grouped = R.groupBy(({ record, t1Sample }) => {
        const t1Track = record.t1
        return t1Track - t1Sample
      }, records)
      const sorted = R.pipe(
        R.toPairs,
        R.map(([offset, records]) => [offset, records.length]),
        R.sort(R.descend(([, count]) => count)),
        R.take(5)
      )(grouped)
      const [offset, count] = R.head(sorted)
      return {
        trackMetadataId,
        seconds: Number(offset) / 20,
        count
      }
    })
    const time5 = performance.now()
    console.log(`[match] grouping by offset: ${time5 - time4}`)
    const bestGroupOfHashes = R.head(bestGroupsOfHashes.sort(R.descend(R.prop('count'))))
    console.log(`hashes.length: ${hashes.length}`)
    console.dir(bestGroupsOfHashes)
    const hashesLength = hashes.length
    if (hashesLength < 50) {
      console.log(`low number of sample hashes (${hashesLength}) - returning null`)
      return null
    }
    const bestCount = bestGroupOfHashes ? bestGroupOfHashes.count : 0
    const matchQuality = bestCount / hashesLength * 100
    console.log(`match quality: ${matchQuality}%`)
    if (matchQuality < 5) {
      console.log(`poor match quality (${matchQuality}%) - returning null`)
      return null
    }
    const track = await db.findTrack(bestGroupOfHashes.trackMetadataId)
    const time = moment.utc(bestGroupOfHashes.seconds * 1000).format('m:ss')
    const result = {
      ...track,
      time
    }
    console.log(`result: ${JSON.stringify(result)}`)
    return result
  }

  const matchOptimised = async (hashes, includeMatchingHashes) => {
    const time1 = performance.now()
    const records = await db.matchOptimised(hashes, includeMatchingHashes)
    const time2 = performance.now()
    console.log(`[matchOptimised] searching: ${time2 - time1} (# hashes: ${hashes.length})`)
    return records
  }

  const maybeMatchOptimised = db.matchOptimised ? { matchOptimised } : {}

  const service = {
    match,
    ...maybeMatchOptimised
  }

  return service
}

module.exports = configureService
