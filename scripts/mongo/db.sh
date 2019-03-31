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
    mongodb-shazizzle-prep \
    mongo shazizzle-prep "/db_scripts/$1"
}

local_shell()
{
  docker exec \
    --interactive \
    --tty \
    mongodb-shazizzle-prep \
    mongo shazizzle-prep
}

local_run()
{
  docker run \
    --name mongodb-shazizzle-prep \
    --publish 27017:27017 \
    --volume "$DIR":/db_scripts \
    --detach \
    mongo:3.4.19-jessie
}

local_start()
{
  docker start mongodb-shazizzle-prep
}

local_stop()
{
  docker stop mongodb-shazizzle-prep
}

local_rm()
{
  docker rm mongodb-shazizzle-prep
}

heroku_run_sql_script()
{
  docker exec \
    mongodb-shazizzle-prep \
    mongo \
      --host "$HEROKU_DB_HOST" \
      --port "$HEROKU_DB_PORT" \
      --username "$HEROKU_DB_USERNAME" \
      --password "$HEROKU_DB_PASSWORD" \
      "$HEROKU_DB_DATABASE" \
      "/db_scripts/$1"
}

heroku_shell()
{
  docker exec \
    --interactive \
    --tty \
    mongodb-shazizzle-prep \
    mongo \
      --host "$HEROKU_DB_HOST" \
      --port "$HEROKU_DB_PORT" \
      --username "$HEROKU_DB_USERNAME" \
      --password "$HEROKU_DB_PASSWORD" \
      "$HEROKU_DB_DATABASE"
}

case "${1:-}" in
  --local)
    case "${2:-}" in
      --create) local_run_sql_script db_create.js ;;
      --drop) local_run_sql_script db_drop.js ;;
      --reset) local_run_sql_script db_reset.js ;;
      --show) local_run_sql_script db_show.js ;;
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
      --create) heroku_run_sql_script db_create.js ;;
      --drop) heroku_run_sql_script db_drop.js ;;
      --reset) heroku_run_sql_script db_reset.js ;;
      --show) heroku_run_sql_script db_show.js ;;
      --shell) heroku_shell ;;
      *) usage; exit 1 ;;
    esac
    ;;

  -h | --help) usage ;;

  *) usage; exit 1 ;;
esac
