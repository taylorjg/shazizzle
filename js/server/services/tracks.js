const configureService = db => {

  const getTracks = () => {
    return db.listTracks()
  }

  const createTrack = (metadata, hashes) => {
    console.log(`[tracksService#createTrack]\n  metadata: ${JSON.stringify(metadata)}\n  hashes.length: ${hashes.length}`)
    return db.createTrack(metadata, hashes)
  }

  const service = {
    getTracks,
    createTrack
  }

  return service
}

module.exports = configureService
