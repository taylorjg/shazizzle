const configureService = (db, dbReadOnly) => {

  const getTracks = () => {
    return db.listTracks()
  }

  const createTrack = (metadata, hashes) => {
    console.log(`[tracksService#createTrack]\n  metadata: ${JSON.stringify(metadata)}\n  hashes.length: ${hashes.length}`)
    if (dbReadOnly) {
      throw new Error('The database is readonly')
    }
    return db.createTrack(metadata, hashes)
  }

  const service = {
    getTracks,
    createTrack
  }

  return service
}

module.exports = configureService
