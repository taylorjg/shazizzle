#!/bin/bash

docker run \
    --name mongodb-shazizzle-prep \
    --publish 27017:27017 \
    --detach \
    mongo:3.4.19-jessie
