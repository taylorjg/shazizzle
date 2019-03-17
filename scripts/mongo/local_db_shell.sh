#!/bin/bash

docker exec \
    --interactive \
    --tty \
    mongodb-shazizzle-prep \
    mongo shazizzle-prep
