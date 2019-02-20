
DOCKER_IMAGE=mentorpal-classifier
DOCKER_CONTAINER=mentorpal-classifier

CLASSIFIER_ROOT=$(shell pwd)
MENTORPAL_ROOT=$(shell dirname ${CLASSIFIER_ROOT})

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

docker-build: build
	docker build -t ${DOCKER_IMAGE} .


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

docker-exec-jupyter: