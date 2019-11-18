#!/usr/bin/env bash

BIN="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

source "${BIN}/lib/getopts_long.bash"

PROJECT_ROOT=$(git rev-parse --show-toplevel 2> /dev/null)
ADDITIONAL_ARGS=""
ARCH=""
DOCKER_CMD=""
DOCKER_CONTAINER=mentor-classifier
DOCKER_IMAGE=""
CHECKPOINT=""
CHECKPOINT_ROOT=${PROJECT_ROOT}/checkpoint
ENTRYPOINT=""
MENTOR=""
MENTOR_ROOT=${PROJECT_ROOT}/mentor
TEST_MENTOR=""

while getopts_long "c: arch: additional-args: checkpoint: container-name: cmd: entrypoint: image: mentor: test-mentor:" OPTKEY; do
  case ${OPTKEY} in
    'arch' )
      ARCH="${OPTARG}"
      ;;
    'additional-args' )
      ADDITIONAL_ARGS="${OPTARG}"
      ;;
    'checkpoint' )
      CHECKPOINT="${OPTARG}"
      ;;
    'c' | 'cmd' )
      DOCKER_CMD="${OPTARG}"
      ;;
    'container-name' )
      DOCKER_CONTAINER="${OPTARG}"
      ;;
    'entrypoint' )
      ENTRYPOINT="${OPTARG}"
      ;;
    'image' )
      DOCKER_IMAGE="${OPTARG}"
      ;;
    'mentor' )
      MENTOR="${OPTARG}"
      ;;
    'test-mentor' )
      TEST_MENTOR="${OPTARG}"
      ;;
  esac
done
shift $((OPTIND -1))

docker run \
        -it \
        --rm \
        --name ${DOCKER_CONTAINER} \
        -v ${CHECKPOINT_ROOT}:/app/checkpoint \
        -v ${PROJECT_ROOT}/classifier/src/mentorpal:/app/mentorpal \
        -v ${PROJECT_ROOT}/mentors/data/mentors:/app/mentors \
        -e ARCH=${ARCH} \
        -e CHECKPOINT=${CHECKPOINT} \
        -e MENTOR_ROOT=${MENTOR_ROOT} \
        -e MENTOR=${MENTOR} \
        -e TEST_MENTOR=${TEST_MENTOR} \
        ${ADDITIONAL_ARGS} \
        --workdir /app \
        --entrypoint ${ENTRYPOINT} \
    ${DOCKER_IMAGE} ${DOCKER_CMD}