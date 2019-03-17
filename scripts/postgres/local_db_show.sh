#!/bin/bash

docker exec \
    postgres-shazizzle-prep \
    psql -U postgres -f /db_scripts/db_show.sql
