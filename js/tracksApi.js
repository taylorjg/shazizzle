/* eslint-env node */
/* eslint-disable no-console */

const express = require('express')
const configureService = require('./tracksService')

const configureRouter = async uri => {

  const service = await configureService(uri)

  const createTrack = async (req, res) => {
    try {
      const track = await service.createTrack(
        req.body.albumTitle,
        req.body.trackTitle,
        req.body.fingerprint
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
