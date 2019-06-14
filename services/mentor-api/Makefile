DOCKER_IMAGE?=mentorpal-mentor-api
DOCKER_CONTAINER?=mentorpal-mentor-api
BUILD_TAG?=
THIS_SERVICE_ROOT=$(shell pwd)
SERVICES_ROOT=$(shell dirname ${THIS_SERVICE_ROOT})
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)

DOCKER_BASE_IMAGE?=mentorpal-classifier$(shell echo "$${BUILD_TAG:+:}$${BUILD_TAG}")
DOCKER_BASE_IMAGE_ID=$(shell docker images -q ${DOCKER_BASE_IMAGE} 2> /dev/null)

.PHONY: docker-build-base
docker-build-base:
	cd ${PROJECT_ROOT}/classifier && \
		$(MAKE) docker-build DOCKER_IMAGE=${DOCKER_BASE_IMAGE}


.PHONY: docker-build
docker-build:
ifeq ("${DOCKER_BASE_IMAGE_ID}", "")
	@echo "base image not found for tag ${DOCKER_BASE_IMAGE}, building..."
	$(MAKE) docker-build-base
else
	@echo "Found base image for tag ${DOCKER_BASE_IMAGE} with id '${DOCKER_BASE_IMAGE_ID}'"
endif
	docker build \
		-t ${DOCKER_IMAGE} \
		--build-arg MENTORPAL_CLASSIFIER_IMAGE=${DOCKER_BASE_IMAGE} \
	.

.PHONY: docker-run
docker-run:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			--shm-size 8G \
			-p 5000:5000 \
		${DOCKER_IMAGE} 


.PHONY: docker-run-dev
docker-run-dev:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			--shm-size 8G \
			-p 5000:5000 \
			-v ${PROJECT_ROOT}/checkpoint:/app/checkpoint \
			-v ${THIS_SERVICE_ROOT}/src/mentor_api:/app/mentor_api \
			-v ${PROJECT_ROOT}/src/mentorpal:/app/mentorpal \
		${DOCKER_IMAGE} 


.PHONY: docker-run-dev-shell
docker-run-dev-shell:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			--shm-size 8G \
			-p 5000:5000 \
			-v ${PROJECT_ROOT}/checkpoint:/app/checkpoint \
			-v ${THIS_SERVICE_ROOT}/src/mentor_api:/app/mentor_api \
			-v ${PROJECT_ROOT}/src/mentorpal:/app/mentorpal \
			--entrypoint /bin/bash \
		${DOCKER_IMAGE} 


.PHONY: exec-shell
exec-shell:
	docker exec \
			-it \
		${DOCKER_CONTAINER} \
			bash


TEST_ENV=mentorpal-mentor-api-test-env
.PHONY: test-env-create
test-env-create:
	cd tests/venv && \
		./create.sh ${TEST_ENV}


.PHONY: test
test:
	source activate ${TEST_ENV} && \
		cd tests && \
		bolt test-features