const path = require('path')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const mongoDb = require('./db/mongo')
const postgresDb = require('./db/postgres')
const tracksApi = require('./api/tracks')
const matchApi = require('./api/match')
const app = express()
const R = require('ramda')
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
    wsStateMap.set(ws, {
      grouped: [],
      matchFound: false
    })
    setTimeout(() => ws.close(), 20 * 1000)
    ws.on('message', async message => {
      const hashes = JSON.parse(message)
      console.log(`[/streamingMatch.onmessage] ${JSON.stringify(hashes)}`)
      console.dir(message)
      const wsState = wsStateMap.get(ws)
      if (!wsState) {
        console.log('Failed to lookup wsState!')
        return
      }

      if (wsState.matchFound) return

      const records = await db.matchPartial(hashes)
      const grouped = R.fromPairs(records.map(r => [`${r.trackId}:${r.offset}`, r.count]))
      wsState.grouped = R.mergeWith(R.add, wsState.grouped, grouped)

      const sorted = R.sort(([, count1], [, count2]) => count2 - count1, R.toPairs(wsState.grouped))
      console.dir(sorted.slice(0, 10))
      const [key, count] = R.head(sorted)
      const trackIdString = count >= 100
        ? key.substr(0, key.indexOf(':'))
        : undefined

      if (trackIdString && ws.readyState === 1) {
        const trackId = Number(trackIdString)
        const match = await db.findTrack(trackId)
        wsState.matchFound = true
        console.dir(match)
        ws.send(JSON.stringify(match))
      }
    })
    ws.on('close', () => {
      console.log(`[/streamingMatch.onclose]`)
      wsStateMap.delete(ws)
    })
    ws.on('error', error => {
      console.log(`[/streamingMatch.onerror] ${error.message}`)
      wsStateMap.delete(ws)
    })
  })

  app.listen(PORT, () => console.log(`Listening on port http://localhost:${PORT}`))
}

main()
