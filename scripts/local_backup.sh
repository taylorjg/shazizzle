#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

export $(cat "$DIR"/.env | xargs)

docker exec \
  postgres-shazizzle \
  pg_dump -Fc --no-acl --no-owner -h localhost -U postgres postgres > "$DIR"/postgres.dump
