#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

export $(grep --invert-match "#" "$DIR"/../.env | xargs)

CONTAINER_NAME=postgres-shazizzle

usage()
{
  echo "db.sh"
  echo "  run"
  echo "  start"
  echo "  stop"
  echo "  rm"
  echo "  ps"
  echo "  logs"
  echo "  create"
  echo "  drop"
  echo "  reset"
  echo "  show"
  echo "  psql"
  echo "  shell"
  echo "  backup"
  echo "  restore"
}

run_container()
{
  docker run \
    --name $CONTAINER_NAME \
    --publish 5432:5432 \
    --volume "$DIR":/db_scripts \
    --env POSTGRES_PASSWORD=mypassword \
    --detach \
    postgres:14
}

start_container()
{
  docker start $CONTAINER_NAME
}

stop_container()
{
  docker stop $CONTAINER_NAME
}

rm_container()
{
  docker rm $CONTAINER_NAME
}

ps_container()
{
  docker ps --filter name=$CONTAINER_NAME
}

logs_container()
{
  docker logs $CONTAINER_NAME
}

run_psql_script()
{
  docker exec \
    $CONTAINER_NAME \
    psql "$DATABASE_URL" -f "/db_scripts/$1"
}

run_psql()
{
  docker exec \
    --interactive \
    --tty \
    $CONTAINER_NAME \
    psql "$DATABASE_URL"
}

run_shell()
{
  docker exec \
    --interactive \
    --tty \
    $CONTAINER_NAME \
    /bin/bash
}

backup()
{
  docker exec \
    $CONTAINER_NAME \
    pg_dump -Fc --no-acl --no-owner $DATABASE_URL -f /db_scripts/postgres.dump
}

restore()
{
  docker exec \
    $CONTAINER_NAME \
    pg_restore -d $DATABASE_URL --clean --no-owner /db_scripts/postgres.dump
}

case "${1:-}" in
  run) run_container ;;
  start) start_container ;;
  stop) stop_container ;;
  rm) rm_container ;;
  ps) ps_container ;;
  logs) logs_container ;;

  create) run_psql_script db_create.sql ;;
  drop) run_psql_script db_drop.sql ;;
  reset) run_psql_script db_reset.sql ;;
  show) run_psql_script db_show.sql ;;
  psql) run_psql ;;
  shell) run_shell ;;

  backup) backup ;;
  restore) restore ;;

  -h | --help) usage ;;

  *) usage; exit 1 ;;
esac
