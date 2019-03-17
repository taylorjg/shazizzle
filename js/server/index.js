const path = require('path')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoDb = require('./db/mongo')
const postgresDb = require('./db/postgres')
const tracksApi = require('./api/tracks')
const matchApi = require('./api/match')

const PORT = process.env.PORT || 3002
const MONGODB_URI = process.env.MONGODB_URI
const DATABASE_URL = process.env.DATABASE_URL

const initDb = dbType => {
  console.log(`[initDb] dbType: ${dbType}`)
  switch (dbType) {
    case 'mongo': return mongoDb(MONGODB_URI)
    case 'postgres': return postgresDb(DATABASE_URL)
    default:
      console.log(`Unknown dbType, "${dbType}".`)
      process.exit(1)
  }
}

const main = async () => {

  const argv = process.argv
  const argc = argv.length
  const dbType = argc === 3 ? argv[2] : 'mongo'
  const db = await initDb(dbType)

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
