#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

export $(cat "$DIR"/.env | xargs)

docker run \
    --name postgres-shazizzle-prep \
    --publish 5432:5432 \
    --volume "$DIR":/db_scripts \
    --env PGPASSWORD=$HEROKU_DB_PASSWORD \
    --detach \
    postgres:11.2
