C1=$1
C2=$2
MENTOR=$3
TEST_SET=testing_data_full.csv

CHECKPOINT_ROOT=$(pwd)
PROJECT_ROOT=$(dirname ${CHECKPOINT_ROOT})

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
        -e MENTOR=${MENTOR} \
        -e TEST_SET=${TEST_SET} \
        --workdir /app \
        --entrypoint /app/checkpoint/bin/compare_checkpoint.py \
    ${DOCKER_IMAGE}