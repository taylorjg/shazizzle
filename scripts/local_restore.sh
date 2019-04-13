#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

export $(cat "$DIR"/.env | xargs)

docker exec \
  postgres-shazizzle-prep \
  pg_restore -U postgres -d postgres --clean /db_scripts/postgres.dump
