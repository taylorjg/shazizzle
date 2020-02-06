const path = require('path')
const express = require('express')
const expressWs = require('express-ws')
const cors = require('cors')
const bodyParser = require('body-parser')
const configurePostgres = require('./db/postgres')
const configureTracksApi = require('./api/tracks')
const configureMatchApi = require('./api/match')
const configureSamplesApi = require('./api/samples')
const configureStreamingMatchWs = require('./ws/streamingMatch')

const PORT = process.env.PORT || 3002
const DATABASE_URL = process.env.DATABASE_URL
const CLIENT_FOLDER = path.resolve(__dirname, '..', 'client')
const SAMPLES_FOLDER = path.resolve(CLIENT_FOLDER, 'samples')

const main = async () => {

  const db = await configurePostgres(DATABASE_URL)

  const apiRouters = [
    configureTracksApi(db),
    configureMatchApi(db),
    configureSamplesApi(SAMPLES_FOLDER)
  ]

  const app = express()
  expressWs(app)
  app.use(cors())
  app.use(bodyParser.json({ limit: '5mb' }))
  app.use(bodyParser.raw({ type: 'application/octet-stream', limit: '1mb' }))
  app.use('/api', apiRouters)
  app.ws('/streamingMatch', configureStreamingMatchWs(db))
  app.use(express.static(CLIENT_FOLDER))
  app.listen(PORT, () => console.log(`Listening on port http://localhost:${PORT}`))
}

main()
