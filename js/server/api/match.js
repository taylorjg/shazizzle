const express = require('express')
const configureService = require('../services/match')

const configureRouter = db => {

  const service = configureService(db)

  const match = async (req, res) => {
    try {
      const includeMatchingHashes = !!req.query.includeMatchingHashes
      const hashes = req.body
      const result = await service.matchFullSample(hashes, includeMatchingHashes)
      res.json(result)
    } catch (error) {
      console.log(`[api.match#match] ${error}`)
      res.status(500).send(error.message || 'Internal Server Error')
    }
  }

  const router = express.Router()
  router.post('/match', match)

  return router
}

module.exports = {
  configureRouter
}
