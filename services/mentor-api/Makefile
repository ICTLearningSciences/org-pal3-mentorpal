SHELL:=/bin/bash
DOCKER_CONTAINER?=mentorpal-mentor-api
BUILD_TAG?=
BUILD_TAG_SUFFIX=$(shell v=$(BUILD_TAG); echo "$${v:+:}$${v}")
DOCKER_ACCOUNT?=
PWD=$(shell pwd)
SERVICE_NAME=$(shell v='$(PWD)'; echo "$${v\#\#*/}")
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
PROJECT_NAME?=mentorpal
DOCKER_BASE_IMAGE?=mentorpal-classifier$(shell echo "$${BUILD_TAG:+:}$${BUILD_TAG}")
DOCKER_BASE_IMAGE_ID=$(shell docker images -q ${DOCKER_BASE_IMAGE} 2> /dev/null)
DOCKER_IMAGE?=$(shell \
	export BUILD_TAG=$(BUILD_TAG) \
		PROJECT_ROOT=$(PROJECT_ROOT) \
		PROJECT_NAME=$(PROJECT_NAME) \
		DOCKER_ACCOUNT=$(DOCKER_ACCOUNT) && \
	$(PROJECT_ROOT)/bin/print_service_tag.sh "$(SERVICE_NAME)"\
)
DOCKER_IMAGE_ID=$(shell docker images -q ${DOCKER_IMAGE} 2> /dev/null)
TEST_IMAGE?=mentorpal-mentor-api-test$(BUILD_TAG_SUFFIX)

virtualenv-installed:
	$(PROJECT_ROOT)/bin/virtualenv_ensure_installed.sh


echo-docker-image:
	@echo "BUILD_TAG=$(BUILD_TAG)"
	@echo "DOCKER_ACCOUNT=$(DOCKER_ACCOUNT)"
	@echo "PROJECT_NAME=$(PROJECT_NAME)"
	@echo "SERVICE_NAME=$(SERVICE_NAME)"
	@echo "DOCKER_IMAGE=$(DOCKER_IMAGE)"
	@echo "BUILD_TAG_SUFFIX=$(BUILD_TAG_SUFFIX)"

.PHONY: docker-build-base
docker-build-base:
	cd $(PROJECT_ROOT)/classifier && \
		$(MAKE) docker-build DOCKER_IMAGE=$(DOCKER_BASE_IMAGE)


.PHONY: docker-build
docker-build:
ifeq ("$(DOCKER_BASE_IMAGE_ID)", "")
	@echo "base image not found for tag $(DOCKER_BASE_IMAGE), building..."
	$(MAKE) docker-build-base
else
	@echo "Found base image for tag $(DOCKER_BASE_IMAGE) with id '$(DOCKER_BASE_IMAGE_ID)'"
endif
	docker build \
		-t $(DOCKER_IMAGE) \
		--build-arg MENTORPAL_CLASSIFIER_IMAGE=$(DOCKER_BASE_IMAGE) \
	.

.PHONY: docker-image-exists
docker-image-exists:
ifeq ("$(DOCKER_IMAGE_ID)", "")
	@echo "image not found for tag $(DOCKER_IMAGE), building..."
	$(MAKE) docker-build
endif
	

.PHONY: docker-run
docker-run: docker-image-exists
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			--shm-size 8G \
			-v $(PROJECT_ROOT)/checkpoint:/app/checkpoint \
			-v $(PROJECT_ROOT)/mentors/data/mentors:/app/mentors \
			-p 5000:5000 \
		$(DOCKER_IMAGE)


.PHONY: docker-run-checkpoint/%
docker-run-checkpoint/%: docker-image-exists
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(PROJECT_ROOT)/checkpoint:/app/checkpoint \
			-v $(PROJECT_ROOT)/mentors/data/mentors:/app/mentors \
			-v $(PWD)/src/mentor_api:/app/mentor_api \
			-v $(PROJECT_ROOT)/classifier/src/mentorpal:/app/mentorpal \
			-e CLASSIFIER_CHECKPOINT=$* \
			--shm-size 8G \
			-p 5000:5000 \
		$(DOCKER_IMAGE)


.PHONY: docker-run-dev
docker-run-dev: docker-image-exists
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			--shm-size 8G \
			-p 5000:5000 \
			-v $(PROJECT_ROOT)/checkpoint:/app/checkpoint \
			-v $(PROJECT_ROOT)/mentors/data/mentors:/app/mentors \
			-v $(PWD)/src/mentor_api:/app/mentor_api \
			-v $(PROJECT_ROOT)/classifier/src/mentorpal:/app/mentorpal \
		$(DOCKER_IMAGE) 


.PHONY: docker-run-dev-shell
docker-run-dev-shell: docker-image-exists
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			--shm-size 8G \
			-p 5000:5000 \
			-v $(PROJECT_ROOT)/checkpoint:/app/checkpoint \
			-v $(PROJECT_ROOT)/mentors/data/mentors:/app/mentors \
			-v $(PWD)/src/mentor_api:/app/mentor_api \
			-v $(PROJECT_ROOT)/classifier/src/mentorpal:/app/mentorpal \
			--entrypoint /bin/bash \
		$(DOCKER_IMAGE) 


.PHONY: exec-shell
exec-shell:
	docker exec \
			-it \
		$(DOCKER_CONTAINER) \
			bash

BEHAVE_RESTFUL=$(PROJECT_ROOT)/behave-restful
$(BEHAVE_RESTFUL)/setup.py:
	@echo "initializing submodule behave-restful..."
	cd $(PROJECT_ROOT) && \
        git submodule init && \
        git submodule update --remote 


TEST_VIRTUAL_ENV=.venv
TEST_VIRTUAL_ENV_PIP=$(TEST_VIRTUAL_ENV)/bin/pip
$(TEST_VIRTUAL_ENV):
	$(MAKE) test-env-create

.PHONY: dev-env-create
test-env-create: $(PROJECT_ROOT)/behave-restful/setup.py virtualenv-installed
	[ -d $(TEST_VIRTUAL_ENV) ] || virtualenv -p python3 $(TEST_VIRTUAL_ENV)
	$(TEST_VIRTUAL_ENV_PIP) install --upgrade pip
	$(TEST_VIRTUAL_ENV_PIP) install -r $(PROJECT_ROOT)/classifier/requirements.txt
	$(TEST_VIRTUAL_ENV_PIP) install -r requirements.txt
	$(TEST_VIRTUAL_ENV_PIP) install -r tests/requirements.txt
	$(TEST_VIRTUAL_ENV_PIP) install -r $(BEHAVE_RESTFUL)/requirements.txt && \
	$(TEST_VIRTUAL_ENV_PIP) install -e $(BEHAVE_RESTFUL)

.PHONY: test-units
test-units: $(TEST_VIRTUAL_ENV)
	source $(TEST_VIRTUAL_ENV)/bin/activate \
		&& export PYTHONPATH=$${PYTHONPATH}:$(PROJECT_ROOT)/services/mentor-api/src \
		&& export CLASSIFIER_CHECKPOINT_ROOT=$(PROJECT_ROOT)/checkpoint \
		&& $(TEST_VIRTUAL_ENV)/bin/py.test -vv


.PHONY: test-integrations
test-integrations: $(TEST_VIRTUAL_ENV) docker-image-exists
	source $(TEST_VIRTUAL_ENV)/bin/activate  && \
		cd tests && \
		export DOCKER_IMAGE=$(DOCKER_IMAGE) && \
		bolt start-api-then-test-features

.PHONY: test
test:
	$(MAKE) test-units
	$(MAKE) test-integrations

.PHONY: test-image-build
test-image-build:
	cd test-image && \
		MENTOR_API_IMAGE=$(DOCKER_IMAGE) \
		TEST_IMAGE=$(TEST_IMAGE) \
		$(MAKE) docker-build

.PHONY: test-image
test-image:
	cd test-image && \
		MENTOR_API_IMAGE=$(DOCKER_IMAGE) \
		TEST_IMAGE=$(TEST_IMAGE) \
		$(MAKE) test
