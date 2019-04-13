CREATE TABLE IF NOT EXISTS track_metadata (
  id serial PRIMARY KEY,
  album_title VARCHAR (128) NOT NULL,
  track_title VARCHAR (128) NOT NULL,
  artist VARCHAR (128) NOT NULL,
  artwork VARCHAR (128) NOT NULL
);

CREATE TABLE IF NOT EXISTS track_hashes (
  id serial PRIMARY KEY,
  tuple int NOT NULL,
  t1 int NOT NULL,
  track_metadata_id INTEGER REFERENCES track_metadata(id)
);

CREATE INDEX IF NOT EXISTS track_hashes_tuple_idx ON track_hashes USING HASH (tuple);
