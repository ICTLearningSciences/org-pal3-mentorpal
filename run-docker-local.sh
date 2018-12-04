#!/bin/sh

# TODO: this is currently hard coded with docker tag, maybe we don't need this script at all (make file only instead)
docker run \
  -it \
  --rm \
  -u 0 \
  -p:8000:8000 \
  --name node-web-app \
  uscictdocker/mentor-pal-web:MentorpalWeb-env-1.0
