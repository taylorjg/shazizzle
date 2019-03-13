const express = require('express')
const configureService = require('./tracksService')

const configureRouter = db => {

  const service = configureService(db)

  const createTrack = async (req, res) => {
    try {
      const track = await service.createTrack(
        req.body.albumTitle,
        req.body.trackTitle,
        req.body.hashes
      )
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
