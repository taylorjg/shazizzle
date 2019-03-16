const MongoClient = require('mongodb').MongoClient
const ObjectID = require('mongodb').ObjectID

const configureDb = async uri => {

  const client = await MongoClient.connect(uri, { useNewUrlParser: true })
  console.log("[configureDb] successfully connected to MongoDB server")
  const db = client.db()

  const trackMetadata = db.collection('track-metadata')
  const trackHashes = db.collection('track-hashes')

  const createTrack = async (metadata, hashes) => {
    const trackMetadataResult = await trackMetadata.insertOne(metadata)
    const trackMetadataId = trackMetadataResult.insertedId
    await trackHashes.insertMany(hashes.map(([tuple, t1]) => ({
      tuple,
      trackMetadataId,
      t1
    })))
    return await trackMetadata.findOne({ _id: trackMetadataId })
  }

  const listTracks = () =>
    trackMetadata
      .find()
      .toArray()

  const findTrack = trackMetadataId =>
    trackMetadata
      .findOne({ _id: new ObjectID(trackMetadataId) })

  const findTuple = tuple =>
    trackHashes
      .find({ tuple })
      .project({ trackMetadataId: 1, t1: 1, _id: 0 })
      .toArray()

  return {
    createTrack,
    listTracks,
    findTrack,
    findTuple
  }
}

module.exports = configureDb
