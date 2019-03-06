
DOCKER_IMAGE=mentorpal-classifier
DOCKER_CONTAINER=mentorpal-classifier

CLASSIFIER_ROOT=$(shell pwd)
MENTORPAL_ROOT=$(shell dirname ${CLASSIFIER_ROOT})

WEBDAV_PATH=https://webdisk.ict.usc.edu/remote.php/webdav/
CHECKPOINT=2019-2-21-220

init-checkpoint:
	rm -r ${MENTORPAL_ROOT}/checkpoint/classifiers/*/*/*
	rm -r ${MENTORPAL_ROOT}/checkpoint/vector_models/*
	make download-checkpoint classifier=lstm_v1 checkpoint=${CHECKPOINT}
	make download-vector-models

clean:
	rm -rf build

# The src for the MentorPAL classifier should live under the 'classifier' folder
# but currently it lives are the root of the project.
# It will require some effort to move the folder and fix everything
# dependent that breaks, so for now just soft link it.
build: clean
	mkdir -p ${CLASSIFIER_ROOT}/build
	mkdir -p ${CLASSIFIER_ROOT}/build/checkpoint/classifiers
	mkdir -p ${CLASSIFIER_ROOT}/build/checkpoint/tests
	cp -r ${MENTORPAL_ROOT}/src ${CLASSIFIER_ROOT}/build
	cp -r ${MENTORPAL_ROOT}/mentors ${CLASSIFIER_ROOT}/build
	cp -r ${MENTORPAL_ROOT}/checkpoint/classifiers ${CLASSIFIER_ROOT}/build/checkpoint
	cp -r ${MENTORPAL_ROOT}/checkpoint/tests ${CLASSIFIER_ROOT}/build/checkpoint
	cp ${MENTORPAL_ROOT}/.netrc ${CLASSIFIER_ROOT}/build

docker-build: build
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

# make classifier={CLASSIFIER} checkpoint={CHECKPOINT} download-checkpoint
#
# download a specific checkpoint from webdisk
# must have a .netrc file with webdisk credentials to run this (see checkpoint/README.md)
download-checkpoint:
	cp ${MENTORPAL_ROOT}/.netrc ~/.netrc

	mkdir -p ${MENTORPAL_ROOT}/checkpoint/classifiers/$(classifier)/$(checkpoint)/clint
	cd ${MENTORPAL_ROOT}/checkpoint/classifiers/$(classifier)/$(checkpoint)/clint && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/clint/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

	mkdir -p ${MENTORPAL_ROOT}/checkpoint/classifiers/$(classifier)/$(checkpoint)/dan
	cd ${MENTORPAL_ROOT}/checkpoint/classifiers/$(classifier)/$(checkpoint)/dan && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/dan/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

	mkdir -p ${MENTORPAL_ROOT}/checkpoint/classifiers/$(classifier)/$(checkpoint)/carlos
	cd ${MENTORPAL_ROOT}/checkpoint/classifiers/$(classifier)/$(checkpoint)/carlos && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/carlos/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

	mkdir -p ${MENTORPAL_ROOT}/checkpoint/classifiers/$(classifier)/$(checkpoint)/julianne
	cd ${MENTORPAL_ROOT}/checkpoint/classifiers/$(classifier)/$(checkpoint)/julianne && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/julianne/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

download-vector-models:
	cp ${MENTORPAL_ROOT}/.netrc ~/.netrc
	mkdir -p ${MENTORPAL_ROOT}/checkpoint/vector_models

	cd ${MENTORPAL_ROOT}/checkpoint/vector_models && \
	printf "mget checkpoint/vector_models/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

# make classifier={CLASSIFIER} checkpoint={CHECKPOINT} upload-checkpoint
#
# upload a specific checkpoint to webdisk
# must have a .netrc file with webdisk credentials to run this (see checkpoint/README.md)
upload-checkpoint:
	cp ${MENTORPAL_ROOT}/.netrc ~/.netrc
	cd ${MENTORPAL_ROOT}/checkpoint && \
	./davupload.sh "classifiers/$(classifier)/$(checkpoint)/" "https://webdisk.ict.usc.edu/remote.php/webdav/checkpoint/classifiers/$(classifier)/"