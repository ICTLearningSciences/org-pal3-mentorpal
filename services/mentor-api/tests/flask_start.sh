#!/bin/bash

TESTS=$(pwd)
MENTOR_API=$(dirname ${TESTS})
if [ -z ${PROJECT_ROOT} ]; then
	PROJECT_ROOT=$(git rev-parse --show-toplevel 2> /dev/null)
fi

IMAGE_NAME=mentorpal-mentor-api
CONTAINER_NAME=mentorpal-mentor-api-testing

# The flask docker image/api we're running
# should be the same one used in production envs,
# so any overrides should be pushed via config file
DOCKER_MOUNT_SRC=${TESTS}/docker_mount
DOCKER_MOUNT_TGT=/app/docker_mount
FLASK_CONFIG_TGT=${DOCKER_MOUNT_TGT}/flask_config.py

docker run \
		-d \
		--rm \
		--name ${CONTAINER_NAME} \
		-p 5000:5000 \
		-v ${MENTOR_API}/src/mentor_api:/app/mentor_api \
		-v ${PROJECT_ROOT}/classifier/src/mentorpal:/app/mentorpal \
		-v ${DOCKER_MOUNT_SRC}:${DOCKER_MOUNT_TGT} \
		-e MENTORPAL_CLASSIFIER_API_SETTINGS=${FLASK_CONFIG_TGT} \
	${IMAGE_NAME}
