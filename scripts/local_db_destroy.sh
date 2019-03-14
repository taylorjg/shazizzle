#!/bin/bash

set -euo pipefail

DIR=$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )

docker run \
    -it \
    --rm \
    --link mongodb-shazizzle-prep \
    --volume "$DIR"/local_db_erase.js:/local_db_erase.js \
    mongo \
    mongo \
        --host mongodb-shazizzle-prep \
        shazizzle-prep \
        /local_db_erase.js
