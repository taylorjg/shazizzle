const configureService = db => {

  const trackMetadata = db.collection('track-metadata')
  const trackHashes = db.collection('track-hashes')

  const getTracks = () => {
    return trackMetadata.find().toArray()
  }

  const createTrack = async (metadata, hashes) => {
    console.log(`[tracksService#createTrack]\n  metadata: ${JSON.stringify(metadata)}\n  hashes.length: ${hashes.length}`)
    const trackMetadataResult = await trackMetadata.insertOne(metadata)
    const trackMetadataId = trackMetadataResult.insertedId
    await trackHashes.insertMany(hashes.map(([tuple, t1]) => ({
      tuple,
      trackMetadataId,
      t1
    })))
    return await trackMetadata.findOne({ _id: trackMetadataId })
  }

  const service = {
    getTracks,
    createTrack
  }

  return service
}

module.exports = configureService
