#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

export $(cat "$DIR"/.env | xargs)

docker run \
    --interactive \
    --tty \
    --rm \
    mongo \
    mongo \
        --host "$HEROKU_DB_HOST" \
        --port "$HEROKU_DB_PORT" \
        --username "$HEROKU_DB_USERNAME" \
        --password "$HEROKU_DB_PASSWORD" \
        "$HEROKU_DB_DATABASE"
