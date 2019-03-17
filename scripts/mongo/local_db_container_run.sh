#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

docker run \
    --name mongodb-shazizzle-prep \
    --publish 27017:27017 \
    --volume "$DIR":/db_scripts \
    --detach \
    mongo:3.4.19-jessie
