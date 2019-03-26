const path = require('path')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoDb = require('./db/mongo')
const postgresDb = require('./db/postgres')
const tracksApi = require('./api/tracks')
const matchApi = require('./api/match')
const app = express()
// eslint-disable-next-line no-unused-vars
const expressWs = require('express-ws')(app)

const PORT = process.env.PORT || 3002
const dbType = process.env.DB_TYPE || 'mongo'
const dbReadOnly = !!process.env.DB_READONLY || false
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

  const db = await initDb(dbType)

  const apiRouters = [
    tracksApi.configureRouter(db, dbReadOnly),
    matchApi.configureRouter(db)
  ]

  app.use(cors())
  app.use(bodyParser.json({ limit: '5mb' }))
  app.use('/api', apiRouters)
  app.use('/', express.static(path.join(__dirname, '..', 'client')))

  const wsStateMap = new Map()

  app.ws('/streamingMatch', ws => {
    wsStateMap.set(ws, [])
    setTimeout(() => ws.close(), 2 * 1000)
    ws.on('message', msg => {
      console.log(`[/streamingMatch onmessage] msg: ${msg}`)
      const wsState = wsStateMap.get(ws)
      if (!wsState) {
        console.log('Failed to lookup wsState!')
        return
      }
      wsState.push(msg)
      if (ws.readyState === 1) {
        // TODO: send matching album details here...
      }
    })
    ws.on('close', () => {
      console.log(`[/streamingMatch onclose]`)
      wsStateMap.delete(ws)
    })
    ws.on('error', e => {
      console.log(`[/streamingMatch onerror] e.message: ${e.message}`)
      wsStateMap.delete(ws)
    })
  })

  app.listen(PORT, () => console.log(`Listening on port http://localhost:${PORT}`))
}

main()
