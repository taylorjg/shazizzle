const path = require('path')
const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')
const postgresDb = require('./db/postgres')
const tracksApi = require('./api/tracks')
const matchApi = require('./api/match')
const app = express()
const R = require('ramda')
const moment = require('moment')
// eslint-disable-next-line no-unused-vars
const expressWs = require('express-ws')(app)

const PORT = process.env.PORT || 3002
const dbReadOnly = !!process.env.DB_READONLY || false
const DATABASE_URL = process.env.DATABASE_URL

const main = async () => {

  const db = await postgresDb(DATABASE_URL)

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
      grouped: {},
      matchFound: false
    })
    setTimeout(() => ws.close(), 20 * 1000)
    ws.on('message', async message => {
      const hashes = JSON.parse(message)
      // console.log(`[/streamingMatch.onmessage] ${JSON.stringify(hashes)}`)
      const wsState = wsStateMap.get(ws)
      if (!wsState) {
        console.log('Failed to lookup wsState!')
        return
      }

      if (wsState.matchFound) return
      const records = await db.matchPartial(hashes)
      if (wsState.matchFound) return

      const grouped = R.fromPairs(records.map(r => [`${r.trackId}:${r.offset}`, r]))
      const addCounts = (r1, r2) => ({ ...r1, count: r1.count + r2.count })
      wsState.grouped = R.mergeWith(addCounts, wsState.grouped, grouped)

      const compareCountsDescending = ([, r1], [, r2]) => r2.count - r1.count
      const sorted = R.sort(compareCountsDescending, R.toPairs(wsState.grouped))
      console.dir(sorted.slice(0, 10))
      if (sorted.length === 0) return
      const [, best] = R.head(sorted)

      const cluster = sorted.filter(([, r]) =>
        r.trackId === best.trackId &&
        r.offset >= best.offset - 2 &&
        r.offset <= best.offset + 2)
      const clusterCountTotal = R.sum(cluster.map(([, r]) => r.count))
      console.log(`clusterCountTotal: ${clusterCountTotal}`)
      console.dir(cluster)

      if (best.count >= 75 && clusterCountTotal >= 150 && ws.readyState === 1) {
        const track = await db.findTrack(best.trackId)
        const sliversPerSecond = 20
        const time = moment.utc(best.offset * 1000 / sliversPerSecond).format('m:ss')
        const match = { ...track, offset: best.offset, time }
        console.dir(match)
        ws.send(JSON.stringify(match))
        wsState.matchFound = true
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
