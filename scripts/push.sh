#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

export $(cat "$DIR"/.env | xargs)

# https://devcenter.heroku.com/articles/heroku-postgres-import-export

docker exec \
  postgres-shazizzle \
  pg_dump -Fc --no-acl --no-owner -h localhost -U postgres postgres > "$DIR"/postgres.dump

aws s3 cp "$DIR"/postgres.dump s3://shazizzle-backups/postgres.dump

SIGNED_URL=$(aws s3 presign s3://shazizzle-backups/postgres.dump)
echo SIGNED_URL: "$SIGNED_URL"

heroku pg:backups:restore "$SIGNED_URL" DATABASE_URL --confirm=shazizzle

aws s3 rm s3://shazizzle-backups/postgres.dump
rm "$DIR"/postgres.dump
