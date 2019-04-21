const path = require('path')
const express = require('express')
const expressWs = require('express-ws')
const cors = require('cors')
const bodyParser = require('body-parser')
const configurePostgres = require('./db/postgres')
const configureTracksApi = require('./api/tracks')
const configureMatchApi = require('./api/match')
const configureStreamingMatchWs = require('./ws/streamingMatch')

const PORT = process.env.PORT || 3002
const DATABASE_URL = process.env.DATABASE_URL

const main = async () => {

  const db = await configurePostgres(DATABASE_URL)

  const apiRouters = [
    configureTracksApi(db),
    configureMatchApi(db)
  ]

  const app = express()
  expressWs(app)
  app.use(cors())
  app.use(bodyParser.json({ limit: '5mb' }))
  app.use('/api', apiRouters)
  app.ws('/streamingMatch', configureStreamingMatchWs(db))
  app.use(express.static(path.resolve(__dirname, '..', 'client')))
  app.listen(PORT, () => console.log(`Listening on port http://localhost:${PORT}`))
}

main()
