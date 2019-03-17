#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

export $(cat "$DIR"/.env | xargs)

docker exec \
    postgres-shazizzle-prep \
    psql \
        -U "$HEROKU_DB_USERNAME" \
        -h "$HEROKU_DB_HOST" \
        -p "$HEROKU_DB_PORT" \
        -d "$HEROKU_DB_DATABASE" \
        -f /db_scripts/db_drop.sql
