#!/bin/bash

docker exec \
    mongodb-shazizzle-prep \
    mongo shazizzle-prep /db_scripts/db_create.js
