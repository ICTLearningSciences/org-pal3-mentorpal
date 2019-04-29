MENTOR=$1
ARCH=$2
CHECKPOINT=$3
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
        -e ARCH=${ARCH} \
        -e CHECKPOINT=${CHECKPOINT} \
        -e MENTOR=${MENTOR} \
        -e TEST_SET=${TEST_SET} \
        --workdir /app \
        --entrypoint /app/checkpoint/bin/checkpoint_test.py \
    ${DOCKER_IMAGE}