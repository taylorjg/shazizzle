const pgp = require('pg-promise')()

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

  return {
    createTrack,
    listTracks,
    findTrack,
    findTuple
  }
}

module.exports = configureDb
