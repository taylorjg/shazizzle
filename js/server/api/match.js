const express = require('express')
const configureService = require('../services/match')

const configureRouter = db => {

  const service = configureService(db)

  const match = async (req, res) => {
    try {
      const hashes = req.body
      console.dir(service)
      const fn = service.matchOptimised || service.match
      const result = await fn(hashes)
      res.json(result)
    } catch (error) {
      console.log(`[matchApi#match] ${error}`)
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
