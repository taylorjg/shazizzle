const path = require('path')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoDb = require('./db/mongo')
const postgresDb = require('./db/postgres')
const tracksApi = require('./api/tracks')
const matchApi = require('./api/match')

// TODO: get from command line
// const dbType = 'mongo'
const dbType = 'postgres'

const PORT = process.env.PORT || 3002
const MONGODB_URI = process.env.MONGODB_URI
const DATABASE_URL = process.env.DATABASE_URL

const main = async () => {

  const db = dbType === 'mongo'
    ? await mongoDb(MONGODB_URI)
    : await postgresDb(DATABASE_URL)

  const apiRouters = [
    tracksApi.configureRouter(db),
    matchApi.configureRouter(db)
  ]

  const app = express()
  app.use(cors())
  app.use(bodyParser.json({ limit: '5mb' }))
  app.use('/api', apiRouters)
  app.use('/', express.static(path.join(__dirname, '..', 'client')))
  app.listen(PORT, () => console.log(`Listening on port ${PORT}`))
}

main()
