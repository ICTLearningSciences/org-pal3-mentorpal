#!/bin/sh

docker run \
  -it \
  --rm \
  -u 0 \
  -p:8000:8000 \
  --name node-web-app \
  -e NODE_ENV=dev \
  mentorpal
