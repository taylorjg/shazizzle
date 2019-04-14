const { performance } = require('perf_hooks')

const configureService = db => {

  const matchFullSample = async (hashes, includeMatchingHashes) => {
    const startTime = performance.now()
    const records = await db.matchFullSample(hashes, includeMatchingHashes)
    const endTime = performance.now()
    const elapsedTime = endTime - startTime
    console.log(`[services.match#matchFullSample] elapsedTime: ${elapsedTime} (# hashes: ${hashes.length})`)
    return records
  }

  const service = {
    matchFullSample
  }

  return service
}

module.exports = configureService
