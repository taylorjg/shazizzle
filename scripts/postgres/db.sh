#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

export $(cat "$DIR"/.env | xargs)

usage()
{
  echo "db.sh"
  echo "  --local < --create | --drop | --reset | --show | --shell | --run | --start | --stop | --rm >"
  echo "  --heroku < --create | --drop | --reset | --show | --shell >"
}

local_run_sql_script()
{
  docker exec \
    postgres-shazizzle-prep \
    psql -U postgres -f "/db_scripts/$1"
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

heroku_run_sql_script()
{
  docker exec \
    postgres-shazizzle-prep \
    psql \
      -U "$HEROKU_DB_USERNAME" \
      -h "$HEROKU_DB_HOST" \
      -p "$HEROKU_DB_PORT" \
      -d "$HEROKU_DB_DATABASE" \
      -f "/db_scripts/$1"
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
      --create) local_run_sql_script db_create.sql ;;
      --drop) local_run_sql_script db_drop.sql ;;
      --reset) local_run_sql_script db_reset.sql ;;
      --show) local_run_sql_script db_show.sql ;;
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
      --create) heroku_run_sql_script db_create.sql ;;
      --drop) heroku_run_sql_script db_drop.sql ;;
      --reset) heroku_run_sql_script db_reset.sql ;;
      --show) heroku_run_sql_script db_show.sql ;;
      --shell) heroku_shell ;;
      *) usage; exit 1 ;;
    esac
    ;;

  -h | --help) usage ;;

  *) usage; exit 1 ;;
esac
