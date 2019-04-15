const R = require('ramda')
const moment = require('moment')

const configureStreamingMatchWs = db => {

  const wsStateMap = new Map()

  const streamingMatch = ws => {

    wsStateMap.set(ws, {
      grouped: {},
      matchFound: false
    })

    setTimeout(() => ws.close(), 20 * 1000)

    ws.on('message', async message => {
      const hashes = JSON.parse(message)
      console.log(`[streamingMatch.onmessage] hashes.length: ${JSON.stringify(hashes.length)}`)
      const wsState = wsStateMap.get(ws)
      if (!wsState) {
        console.log('Failed to lookup wsState!')
        return
      }

      if (wsState.matchFound) return
      const records = await db.matchPartialSample(hashes)
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
      console.log(`[streamingMatch.onmessage] clusterCountTotal: ${clusterCountTotal}`)
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
      console.log(`[streamingMatch.onclose]`)
      wsStateMap.delete(ws)
    })

    ws.on('error', error => {
      console.log(`[streamingMatch.onerror] ${error.message}`)
      wsStateMap.delete(ws)
    })
  }

  return streamingMatch
}

module.exports = configureStreamingMatchWs
