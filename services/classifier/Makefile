DOCKER_ACCOUNT?=uscictdocker
DOCKER_REPO?=mentorpal-classifier
DOCKER_TAG?=latest

DOCKER_IMAGE?=${DOCKER_ACCOUNT}/${DOCKER_REPO}:${DOCKER_TAG}
DOCKER_CONTAINER=mentorpal-classifier

CLASSIFIER_ROOT=$(shell pwd)
SERVICES_ROOT=$(shell dirname ${CLASSIFIER_ROOT})
MENTORPAL_ROOT=$(shell dirname ${SERVICES_ROOT})

CHECKPOINT=2019-02-21-0220

clean:
	rm -rf build

# The src for the MentorPAL classifier should live under the 'classifier' folder
# but currently it lives are the root of the project.
# It will require some effort to move the folder and fix everything
# dependent that breaks, so for now just soft link it.
build: clean
	mkdir -p ${CLASSIFIER_ROOT}/build
	cp -r ${MENTORPAL_ROOT}/src ${CLASSIFIER_ROOT}/build
	cp -r ${MENTORPAL_ROOT}/mentors ${CLASSIFIER_ROOT}/build
	cp ${MENTORPAL_ROOT}/.netrc ${CLASSIFIER_ROOT}/build

docker-build: clean build
	docker build --build-arg CHECKPOINT=${CHECKPOINT} -t ${DOCKER_IMAGE} .

docker-run:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			--shm-size 8G \
			-p 8888:8888 \
			-v ${MENTORPAL_ROOT}:/workingcopy \
		${DOCKER_IMAGE} \
			bash

docker-run-dev:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			--shm-size 8G \
			-p 8888:8888 \
			-v ${MENTORPAL_ROOT}:/workingcopy \
			-v ${MENTORPAL_ROOT}:/app/mentorpal \
		${DOCKER_IMAGE} \
			bash
