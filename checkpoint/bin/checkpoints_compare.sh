#!/bin/bash
MENTOR=$1
A1=$2
C1=$3
A2=$4
C2=$5

TEST_SET=testing_data_full.csv

PROJECT_ROOT=$(git rev-parse --show-toplevel 2> /dev/null)
CHECKPOINT_ROOT=${PROJECT_ROOT}/checkpoint

DOCKER_ACCOUNT=uscictdocker
DOCKER_REPO=mentorpal-classifier
DOCKER_TAG=latest

DOCKER_IMAGE=${DOCKER_ACCOUNT}/${DOCKER_REPO}:${DOCKER_TAG}
DOCKER_CONTAINER=mentorpal-classifier

docker run \
        -it \
        --rm \
        --name ${DOCKER_CONTAINER} \
        -v ${CHECKPOINT_ROOT}:/app/checkpoint \
        -v ${PROJECT_ROOT}/mentors:/app/mentors \
        -e CHECKPOINT_1=${C1} \
        -e CHECKPOINT_2=${C2} \
        -e ARCH_1=${A1} \
        -e ARCH_2=${A2} \
        -e MENTOR=${MENTOR} \
        -e TEST_SET=${TEST_SET} \
        --workdir /app \
        --entrypoint /app/checkpoint/bin/checkpoints_compare.py \
    ${DOCKER_IMAGE}