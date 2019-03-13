/* eslint-env node */
/* eslint-disable no-console */

const express = require('express')
const configureService = require('./matchService')

const configureRouter = db => {

  const service = configureService(db)

  const match = async (req, res) => {
    try {
      const hashes = req.body
      const result = await service.match(hashes)
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
