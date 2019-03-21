-- \d track_metadata;
-- \d track_hashes;

-- SELECT COUNT(*) FROM track_metadata;
-- SELECT COUNT(*) FROM track_hashes;

SELECT m.album_title, COUNT(h.id)
FROM track_hashes AS h
INNER JOIN track_metadata AS m
ON h.track_metadata_id = m.id
GROUP BY m.album_title
ORDER BY count(h.id) DESC;
