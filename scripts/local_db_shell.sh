#!/bin/bash

set -euo pipefail

docker run \
    --interactive \
    --tty \
    --rm \
    --link mongodb-shazizzle-prep \
    mongo \
    mongo \
        --host mongodb-shazizzle-prep \
        shazizzle-prep
