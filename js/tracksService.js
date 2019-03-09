/* eslint-env node */
/* eslint-disable no-console */

const MongoClient = require('mongodb').MongoClient

const configureService = async uri => {

  const client = await MongoClient.connect(uri, { useNewUrlParser: true })
  console.log("[MongoClient.connect] Connected successfully to server")
  const db = client.db()
  const tracks = db.collection('tracks')

  const createTrack = async (albumTitle, trackTitle, fingerprint) => {
    console.log(`[tracksService#createTrack]\n${albumTitle}\n${trackTitle}\n${fingerprint.length}`)
    const promise = tracks.insertOne({
      albumTitle,
      trackTitle,
      fingerprint
    })
    const result = await promise
    const _id = result.insertedId
    return { _id }
  }

  const service = {
    createTrack
  }

  return service
}

module.exports = configureService
