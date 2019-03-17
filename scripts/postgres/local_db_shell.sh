#!/bin/bash

docker exec \
    --interactive \
    --tty \
    postgres-shazizzle-prep \
    psql -U postgres
