#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

docker run \
    --interactive \
    --tty \
    --rm \
    --link mongodb-shazizzle-prep \
    --volume "$DIR"/db_drop.js:/db_drop.js \
    mongo \
    mongo \
        --host mongodb-shazizzle-prep \
        shazizzle-prep \
        /db_drop.js
