#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

docker run \
    --name postgres-shazizzle-prep \
    --publish 5432:5432 \
    --volume "$DIR":/db_scripts \
    --detach \
    postgres:11.2
