printjson(db.createCollection('track-metadata'))
printjson(db.createCollection('track-hashes'))
printjson(db['track-hashes'].createIndex({ tuple: 1 }))
