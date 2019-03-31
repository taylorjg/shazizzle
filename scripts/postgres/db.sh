#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

export $(cat "$DIR"/.env | xargs)

usage()
{
  echo "db.sh"
  echo -e "\t< --local | --heroku >"
  echo -e "\t< --create | --drop | --reset | --show | --shell | --run | --start | --stop | --rm >"
}

local_create()
{
  docker exec \
    postgres-shazizzle-prep \
    psql -U postgres -f /db_scripts/db_create.sql
}

local_drop()
{
  docker exec \
    postgres-shazizzle-prep \
    psql -U postgres -f /db_scripts/db_drop.sql
}

local_reset()
{
  docker exec \
    postgres-shazizzle-prep \
    psql -U postgres -f /db_scripts/db_reset.sql
}

local_show()
{
  docker exec \
    postgres-shazizzle-prep \
    psql -U postgres -f /db_scripts/db_show.sql
}

local_shell()
{
  docker exec \
    --interactive \
    --tty \
    postgres-shazizzle-prep \
    psql -U postgres
}

local_run()
{
  docker run \
    --name postgres-shazizzle-prep \
    --publish 5432:5432 \
    --volume "$DIR":/db_scripts \
    --env PGPASSWORD=$HEROKU_DB_PASSWORD \
    --detach \
    postgres:11.2
}

local_start()
{
  docker start postgres-shazizzle-prep
}

local_stop()
{
  docker stop postgres-shazizzle-prep
}

local_rm()
{
  docker rm postgres-shazizzle-prep
}

heroku_create()
{
  docker exec \
    postgres-shazizzle-prep \
    psql \
      -U "$HEROKU_DB_USERNAME" \
      -h "$HEROKU_DB_HOST" \
      -p "$HEROKU_DB_PORT" \
      -d "$HEROKU_DB_DATABASE" \
      -f /db_scripts/db_create.sql
}

heroku_drop()
{
  docker exec \
    postgres-shazizzle-prep \
    psql \
      -U "$HEROKU_DB_USERNAME" \
      -h "$HEROKU_DB_HOST" \
      -p "$HEROKU_DB_PORT" \
      -d "$HEROKU_DB_DATABASE" \
      -f /db_scripts/db_drop.sql
}

heroku_reset()
{
  docker exec \
    postgres-shazizzle-prep \
    psql \
      -U "$HEROKU_DB_USERNAME" \
      -h "$HEROKU_DB_HOST" \
      -p "$HEROKU_DB_PORT" \
      -d "$HEROKU_DB_DATABASE" \
      -f /db_scripts/db_reset.sql
}

heroku_show()
{
  docker exec \
    postgres-shazizzle-prep \
    psql \
      -U "$HEROKU_DB_USERNAME" \
      -h "$HEROKU_DB_HOST" \
      -p "$HEROKU_DB_PORT" \
      -d "$HEROKU_DB_DATABASE" \
      -f /db_scripts/db_show.sql
}

heroku_shell()
{
  docker exec \
    --interactive \
    --tty \
    postgres-shazizzle-prep \
    psql \
      -U "$HEROKU_DB_USERNAME" \
      -h "$HEROKU_DB_HOST" \
      -p "$HEROKU_DB_PORT" \
      -d "$HEROKU_DB_DATABASE"
}

case "${1:-}" in
  --local)
    case "${2:-}" in
      --create) local_create ;;
      --drop) local_drop ;;
      --reset) local_reset ;;
      --show) local_show ;;
      --shell) local_shell ;;
      --run) local_run ;;
      --start) local_start ;;
      --stop) local_stop ;;
      --rm) local_rm ;;
      *) usage; exit 1 ;;
    esac
    ;;

  --heroku)
    case "${2:-}" in
      --create) heroku_create ;;
      --drop) heroku_drop ;;
      --reset) heroku_reset ;;
      --show) heroku_show ;;
      --shell) heroku_shell ;;
      *) usage; exit 1 ;;
    esac
    ;;

  -h | --help) usage ;;

  *) usage; exit 1 ;;
esac
