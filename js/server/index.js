/* eslint-env node */
/* eslint-disable no-console */

const path = require('path')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const tracksApi = require('./tracksApi')
const matchApi = require('./matchApi')
const MongoClient = require('mongodb').MongoClient

const PORT = process.env.PORT || 3002
const MONGODB_URI = process.env.MONGODB_URI

const main = async () => {
  const client = await MongoClient.connect(MONGODB_URI, { useNewUrlParser: true })
  console.log("[main] successfully connected to MongoDB server")
  const db = client.db()
  const apiRouters = [
    tracksApi.configureRouter(db),
    matchApi.configureRouter(db)
  ]
  const app = express()
  console.dir(__dirname)
  app.use(cors())
  app.use(bodyParser.json({ limit: '5mb' }))
  app.use('/api', apiRouters)
  app.use('/', express.static(path.join(__dirname, '..')))
  app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
}

main()
