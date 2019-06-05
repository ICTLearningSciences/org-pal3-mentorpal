DOCKER_ACCOUNT?=uscictdocker
DOCKER_REPO?=mentorpal-classifier
DOCKER_TAG?=latest

DOCKER_IMAGE?=$(DOCKER_ACCOUNT)/$(DOCKER_REPO):$(DOCKER_TAG)
DOCKER_CONTAINER=mentorpal-classifier

CLASSIFIER_ROOT=$(shell pwd)
PROJECT_ROOT=$(shell git rev-parse --show-toplevel 2> /dev/null)
CHECKPOINT_ROOT=$(PROJECT_ROOT)/checkpoint
CHECKPOINT=2019-02-21-0220
ARCH=lstm_v1
CHECKPOINT_PATH_RELATIVE=checkpoint/classifiers/$(ARCH)/$(CHECKPOINT)

.PHONY clean:
clean:
	rm -rf build


.PHONY checkpoint-vector-models:
checkpoint-vector-models:
	cd $(CHECKPOINT_ROOT) && \
	CHECKPOINT=$(CHECKPOINT) ARCH=$(ARCH) $(MAKE) checkpoint-vector-models


BUILD=$(CLASSIFIER_ROOT)/build
build: clean checkpoint-vector-models
	cd $(CHECKPOINT_ROOT)
	mkdir -p $(BUILD)
	cp -r $(PROJECT_ROOT)/src $(BUILD)
	cp -r $(PROJECT_ROOT)/mentors $(BUILD)
	mkdir -p $(BUILD)/$(CHECKPOINT_PATH_RELATIVE)
	cp -r $(PROJECT_ROOT)/$(CHECKPOINT_PATH_RELATIVE)/* $(BUILD)/$(CHECKPOINT_PATH_RELATIVE)
	cp -r $(PROJECT_ROOT)/checkpoint/vector_models $(BUILD)/checkpoint
	cp -r $(PROJECT_ROOT)/checkpoint/bin $(BUILD)

docker-build: clean build
	docker build \
			--build-arg CHECKPOINT=$(CHECKPOINT) \
			--build-arg ARCH=$(ARCH) \
			-t $(DOCKER_IMAGE) \
		.


docker-run:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			--shm-size 8G \
			-p 8888:8888 \
		$(DOCKER_IMAGE) \
			bash


docker-run-dev:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			--shm-size 8G \
			-p 8888:8888 \
			-v $(PROJECT_ROOT):/app/mentorpal \
		$(DOCKER_IMAGE) \
			bash
