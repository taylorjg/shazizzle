#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

export $(cat "$DIR"/.env | xargs)

docker exec \
    mongodb-shazizzle-prep \
    mongoexport \
        --db shazizzle-prep \
        --collection track-metadata \
        --out track-metadata.json

docker exec \
    mongodb-shazizzle-prep \
    mongoexport \
        --db shazizzle-prep \
        --collection track-hashes \
        --out track-hashes.json

docker exec \
    mongodb-shazizzle-prep \
    mongoimport \
        --host "$HEROKU_DB_HOST" \
        --port "$HEROKU_DB_PORT" \
        --username "$HEROKU_DB_USERNAME" \
        --password "$HEROKU_DB_PASSWORD" \
        --db "$HEROKU_DB_DATABASE" \
        --collection track-metadata \
        --drop \
        --file track-metadata.json

docker exec \
    mongodb-shazizzle-prep \
    mongoimport \
        --host "$HEROKU_DB_HOST" \
        --port "$HEROKU_DB_PORT" \
        --username "$HEROKU_DB_USERNAME" \
        --password "$HEROKU_DB_PASSWORD" \
        --db "$HEROKU_DB_DATABASE" \
        --collection track-hashes \
        --drop \
        --file track-hashes.json
