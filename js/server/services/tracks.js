const configureService = db => {

  const getTracks = () =>
    db.listTracks()

  const createTrack = (metadata, hashes) =>
    db.createTrack(metadata, hashes)

  const service = {
    getTracks,
    createTrack
  }

  return service
}

module.exports = configureService
