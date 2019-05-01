CHECKPOINT_ROOT=$(shell pwd)
PROJECT_ROOT=$(shell git rev-parse --show-toplevel 2> /dev/null)

WEBDAV_PATH=https://webdisk.ict.usc.edu/remote.php/webdav/
CHECKPOINT ?= 2019-02-21-0220
ARCH ?= lstm_v1
MENTOR ?= clint

DOCKER_ACCOUNT?=uscictdocker
DOCKER_REPO?=mentorpal-classifier
DOCKER_TAG?=latest
DOCKER_IMAGE?=${DOCKER_ACCOUNT}/${DOCKER_REPO}:${DOCKER_TAG}

clean:
	rm -r classifiers/*/*/*/*
	rm -r vector_models/*.bin

init: vector-models
	$(MAKE) download-checkpoint classifier=$(ARCH) checkpoint=$(CHECKPOINT)


# make classifier={CLASSIFIER} checkpoint={CHECKPOINT} download-checkpoint
#
# download a specific checkpoint from webdisk
# must have a .netrc file with webdisk credentials to run this (see checkpoint/README.md)
download-checkpoint:
	cp ${PROJECT_ROOT}/.netrc ~/.netrc

	mkdir -p classifiers/$(classifier)/$(checkpoint)/clint
	cd classifiers/$(classifier)/$(checkpoint)/clint && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/clint/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

	mkdir -p classifiers/$(classifier)/$(checkpoint)/dan
	cd classifiers/$(classifier)/$(checkpoint)/dan && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/dan/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

	mkdir -p classifiers/$(classifier)/$(checkpoint)/carlos
	cd classifiers/$(classifier)/$(checkpoint)/carlos && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/carlos/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

	mkdir -p classifiers/$(classifier)/$(checkpoint)/julianne
	cd classifiers/$(classifier)/$(checkpoint)/julianne && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/julianne/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

vector-models:
	cp ${PROJECT_ROOT}/.netrc ~/.netrc
	mkdir -p vector_models
	cd vector_models && \
	printf "mget checkpoint/vector_models/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd


# make classifier={CLASSIFIER} checkpoint={CHECKPOINT} upload-checkpoint
upload-checkpoint:
	cp ${PROJECT_ROOT}/.netrc ~/.netrc
	./bin/davupload.sh "classifiers/$(classifier)/$(checkpoint)/" "https://webdisk.ict.usc.edu/remote.php/webdav/checkpoint/classifiers/$(classifier)/"

# CHECKPOINT={CHECKPOINT} MENTOR={MENTOR} make test-checkpoint
checkpoint-test:
	./bin/checkpoint_test.sh $(MENTOR) $(ARCH) $(CHECKPOINT) 

# make c1={CHECKPOINT1} c2={CHECKPOINT2} m={MENTOR} compare-checkpoints
checkpoints-compare:
	./bin/checkpoints_compare.sh $(mentor) $(arch_1) $(checkpoint_1) $(arch_2) $(checkpoint_2) 

checkpoint-train:
	./bin/checkpoint_train.sh $(ARCH) ${checkpoint}


.PHONY: docker-run-dev
docker-run-dev:
	docker run \
        -it \
        --rm \
        --name ${DOCKER_REPO} \
        -v ${CHECKPOINT_ROOT}:/app/checkpoint \
        -v ${PROJECT_ROOT}/mentors:/app/mentors \
        -v ${PROJECT_ROOT}/src/mentorpal:/app/mentorpal \
        --workdir /app \
        --entrypoint /bin/bash \
    ${DOCKER_IMAGE}
	