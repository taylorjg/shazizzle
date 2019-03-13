const express = require('express')
const configureService = require('./tracksService')

const configureRouter = db => {

  const service = configureService(db)

  const createTrack = async (req, res) => {
    try {
      const metadata = {
        albumTitle: req.body.albumTitle,
        trackTitle: req.body.trackTitle,
        artist: req.body.artist,
        artwork: req.body.artwork
      }
      const track = await service.createTrack(metadata, req.body.hashes)
      res.json(track)
    } catch (error) {
      console.log(`[tracksApi#createTrack] ${error}`)
      res.status(500).send(error.message || 'Internal Server Error')
    }
  }

  const router = express.Router()
  router.post('/tracks', createTrack)

  return router
}

module.exports = {
  configureRouter
}
