C1=$1
C2=$2
MENTOR=clint
TEST_SET=testing_data_full.csv

CHECKPOINT_ROOT=$(pwd)
PROJECT_ROOT=$(dirname ${CHECKPOINT_ROOT})

DOCKER_ACCOUNT=uscictdocker
DOCKER_REPO=mentorpal-classifier
DOCKER_TAG=latest
DOCKER_IMAGE=${DOCKER_ACCOUNT}/${DOCKER_REPO}:${DOCKER_TAG}

docker build -t ${DOCKER_IMAGE} .

docker run \
        -it \
        --rm \
        -v ${CHECKPOINT_ROOT}:/app/checkpoint \
        -v ${PROJECT_ROOT}/src:/app/src \
        -v ${PROJECT_ROOT}/mentors:/app/mentors \
        -e CHECKPOINT_1=${C1} \
        -e CHECKPOINT_2=${C2} \
        -e MENTOR=${MENTOR} \
        -e TEST_SET=${TEST_SET} \
    ${DOCKER_IMAGE} \
        python /app/src/compare_checkpoint.py