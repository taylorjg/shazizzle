const pgp = require('pg-promise')()
const moment = require('moment')

const configureDb = async uri => {

  const db = pgp(uri)

  const createTrack = async (metadata, hashes) => {
    const trackMetadataId = await db.one(
      `
        INSERT INTO track_metadata
        (album_title, track_title, artist, artwork)
        VALUES ($1, $2, $3, $4)
        RETURNING id
      `,
      [
        metadata.albumTitle,
        metadata.trackTitle,
        metadata.artist,
        metadata.artwork
      ],
      record => record.id)
    const insertQueryPrefix = 'INSERT INTO track_hashes (tuple, t1, track_metadata_id) VALUES'
    const insertQueryValues = hashes.map(([tuple, t1]) => `(${tuple}, ${t1}, ${trackMetadataId})`).join(', ')
    const insertQuery = [insertQueryPrefix, insertQueryValues].join(' ')
    await db.none(insertQuery)
    return findTrack(trackMetadataId)
  }

  const listTracks = () =>
    db.any(
      `
        SELECT
          id,
          album_title AS "albumTitle",
          track_title AS "trackTitle",
          artist,
          artwork
        FROM track_metadata
      `
    )

  const findTrack = id =>
    db.one(
      `
        SELECT
          id,
          album_title AS "albumTitle",
          track_title AS "trackTitle",
          artist,
          artwork
        FROM track_metadata
        WHERE id = $1
      `,
      id)

  const findTuple = tuple =>
    db.any(
      `
        SELECT
          track_metadata_id AS "trackMetadataId",
          t1
        FROM track_hashes
        WHERE tuple = $1
      `,
      tuple)

  const matchOptimised = async (hashes, includeMatchingHashes) => {
    try {
      if (hashes.length === 0) {
        console.log(`[postgres#matchOptimised] no hashes - returning null`)
        return null
      }
      await db.none(
        `
          CREATE TEMPORARY TABLE samples (
            tuple int NOT NULL,
            t1 int NOT NULL
          )
        `)
      const insertQueryPrefix = 'INSERT INTO samples (tuple, t1) VALUES'
      const insertQueryValues = hashes.map(([tuple, t1]) => `(${tuple}, ${t1})`).join(', ')
      const insertQuery = [insertQueryPrefix, insertQueryValues].join(' ')
      await db.none(insertQuery)
      const records = await db.any(
        `
          SELECT
            track_hashes.track_metadata_id,
            (track_hashes.t1 - samples.t1) AS offset,
            COUNT (track_hashes.t1 - samples.t1) AS count
          FROM track_hashes
          INNER JOIN samples ON track_hashes.tuple = samples.tuple
          GROUP BY
            track_hashes.track_metadata_id,
            (track_hashes.t1 - samples.t1)
          HAVING COUNT (track_hashes.t1 - samples.t1) >= 50
          ORDER BY count DESC
          LIMIT 1
        `)
      console.dir(records)
      if (records.length === 0) {
        console.log(`[postgres#matchOptimised] no records - returning null`)
        return null
      }
      const bestMatch = records[0]
      if (bestMatch.count < 50) {
        console.log(`[postgres#matchOptimised] best match has low count (${bestMatch.count}) - retuning null`)
        return null
      }
      const seconds = bestMatch.offset / 20
      const track = await findTrack(bestMatch.track_metadata_id)
      const time = moment.utc(seconds * 1000).format('m:ss')
      const maybeMatchingHashes = includeMatchingHashes
        ? ({
          matchingHashes: await db.any(
            `
            SELECT
              samples.t1 AS "t1Sample",
              track_hashes.t1 AS "t1Track",
              (track_hashes.t1 - samples.t1) AS offset
            FROM track_hashes
            INNER JOIN samples ON track_hashes.tuple = samples.tuple
            WHERE track_hashes.track_metadata_id = $1
          `,
            bestMatch.track_metadata_id)
        })
        : {}
      console.dir(maybeMatchingHashes)
      const result = {
        ...track,
        offset: bestMatch.offset,
        time,
        ...maybeMatchingHashes
      }
      return result
    } finally {
      await db.none('DROP TABLE samples')
    }
  }

  return {
    createTrack,
    listTracks,
    findTrack,
    findTuple,
    matchOptimised
  }
}

module.exports = configureDb
