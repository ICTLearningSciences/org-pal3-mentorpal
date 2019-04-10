C=$1
MENTOR=$2
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
        -v ${PROJECT_ROOT}/src:/app/src \
        -v ${PROJECT_ROOT}/mentors:/app/mentors \
        -v ${PROJECT_ROOT}/bin/test_checkpoint.py:/app/src/test_checkpoint.py \
        -e CHECKPOINT=${C} \
        -e MENTOR=${MENTOR} \
        -e TEST_SET=${TEST_SET} \
    ${DOCKER_IMAGE} \
        python /app/src/test_checkpoint.py 