DOCKER_IMAGE?=mentorpal-classifier
DOCKER_CONTAINER=mentorpal-classifier
CLASSIFIER_ROOT=$(shell pwd)
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
CHECKPOINT_ROOT=$(PROJECT_ROOT)/checkpoint
CHECKPOINT=2019-06-13-1900
ARCH=lstm_v1
CHECKPOINT_PATH_RELATIVE=checkpoint/classifiers/$(ARCH)/$(CHECKPOINT)
PWD=$(shell pwd)

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
			-e ARCH=${ARCH} \
			-e CHECKPOINT=${CHECKPOINT} \
			-e MENTOR=${MENTOR} \
		$(DOCKER_IMAGE) \
			bash


docker-run-dev:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			--shm-size 8G \
			-p 8888:8888 \
			-v $(CLASSIFIER_ROOT)/src/mentorpal:/app/mentorpal \
			-v $(PROJECT_ROOT)/checkpoint:/app/checkpoint \
			-e ARCH=${ARCH} \
			-e CHECKPOINT=${CHECKPOINT} \
			-e MENTOR=${MENTOR} \
		$(DOCKER_IMAGE) \
			bash

TEST_VIRTUAL_ENV=.venv
TEST_VIRTUAL_ENV_PIP=$(TEST_VIRTUAL_ENV)/bin/pip
$(TEST_VIRTUAL_ENV):
	$(MAKE) test-env-create

.PHONY: dev-env-create
test-env-create: virtualenv-installed
	[ -d $(TEST_VIRTUAL_ENV) ] || virtualenv -p python3 $(TEST_VIRTUAL_ENV)
	$(TEST_VIRTUAL_ENV_PIP) install --upgrade pip
	$(TEST_VIRTUAL_ENV_PIP) install -r requirements.test.txt

.PHONY: test
test: $(TEST_VIRTUAL_ENV)
	source $(TEST_VIRTUAL_ENV)/bin/activate && \
		export PYTHONPATH=$${PYTHONPATH}:$(PWD)/src && \
		$(TEST_VIRTUAL_ENV)/bin/py.test -vv

virtualenv-installed:
	$(PROJECT_ROOT)/bin/virtualenv_ensure_installed.sh