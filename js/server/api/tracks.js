const express = require('express')
const configureService = require('../services/tracks')

const configureRouter = db => {

  const service = configureService(db)

  const getTracks = async (_, res) => {
    try {
      const tracks = await service.getTracks()
      res.json(tracks)
    } catch (error) {
      console.log(`[tracksApi#getTracks] ${error}`)
      res.status(500).send(error.message || 'Internal Server Error')
    }
  }

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
  router.get('/tracks', getTracks)
  router.post('/tracks', createTrack)

  return router
}

module.exports = configureRouter
