SHELL:=/bin/bash
PWD=$(shell pwd)
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
PROJECT_NAME?=mentorpal
SERVICE_ROOT=$(PROJECT_ROOT)/services/mentor-api
BEHAVE_RESTFUL_SUBMODULE=$(PROJECT_ROOT)/behave-restful
BEHAVE_RESTFUL_SUBMODULE_POPULATED=$(BEHAVE_RESTFUL_SUBMODULE)/setup.py
TEST_IMAGE?=mentorpal-mentor-api-test
TEST_IMAGE_IMAGE_ID=$(shell docker images -q ${TEST_IMAGE} 2> /dev/null)
TEST_IMAGE_CONTAINER=mentorpal-mentor-api-test
MENTOR_API_IMAGE?=mentorpal-mentor-api
MENTOR_API_IMAGE_ID=$(shell docker images -q ${MENTOR_API_IMAGE} 2> /dev/null)

$(BEHAVE_RESTFUL_SUBMODULE_POPULATED):
	@echo "initializing submodule behave-restful..."
	cd $(PROJECT_ROOT) && \
        git submodule init && \
        git submodule update --remote 

build/behave-restful: $(BEHAVE_RESTFUL_SUBMODULE_POPULATED)
	mkdir -p build
	cp -r $(BEHAVE_RESTFUL_SUBMODULE) build/behave-restful

build/tests:
	mkdir -p build
	cp -r $(SERVICE_ROOT)/tests build/tests

.PHONY: clean
clean:
	rm -rf build

build: build/tests build/behave-restful

.PHONY: docker-build
docker-build: clean build
	docker build \
			-t $(TEST_IMAGE) \
			--build-arg MENTOR_API_IMAGE=$(MENTOR_API_IMAGE) \
		.

mentor-api-image-exists:
ifeq ("$(MENTOR_API_IMAGE_ID)", "")
	@echo "mentor-api image not found for tag $(MENTOR_API_IMAGE), building..."
	cd .. && $(MAKE) docker-build
endif

test-image-exists: mentor-api-image-exists
ifeq ("$(TEST_IMAGE_IMAGE_ID)", "")
	@echo "test image not found for tag $(TEST_IMAGE_IMAGE), building..."
	$(MAKE) docker-build
endif

.PHONY: test
test: test-image-exists
	docker run \
			--name $(TEST_IMAGE_CONTAINER) \
			-d \
			-t \
			--rm \
		$(TEST_IMAGE) 
	sleep 1
	docker exec $(TEST_IMAGE_CONTAINER) bash -c "cd /test/tests && ./bin/wait_for_server_then_run_tests.sh"
	docker kill $(TEST_IMAGE_CONTAINER)
