const configureService = db => {

  const trackMetadata = db.collection('track-metadata')
  const trackHashes = db.collection('track-hashes')

  const createTrack = async (metadata, hashes) => {
    console.log(`[tracksService#createTrack]\n  metadata: ${JSON.stringify(metadata)}\n  hashes.length: ${hashes.length}`)
    const trackMetadataResult = await trackMetadata.insertOne(metadata)
    const trackMetadataId = trackMetadataResult.insertedId
    const trackHashesResult = await trackHashes.insertMany(hashes.map(([tuple, t1]) => ({
      tuple,
      trackMetadataId,
      t1
    })))
    const trackHashesIds = trackHashesResult.insertedIds
    return { trackMetadataId, trackHashesIdsCount: Array.from(Object.keys(trackHashesIds)).length }
  }

  const service = {
    createTrack
  }

  return service
}

module.exports = configureService
