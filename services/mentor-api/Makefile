DOCKER_ACCOUNT?=uscictdocker
DOCKER_REPO?=mentorpal-mentor-api
DOCKER_TAG?=latest
DOCKER_IMAGE?=${DOCKER_ACCOUNT}/${DOCKER_REPO}:${DOCKER_TAG}
DOCKER_CONTAINER=${DOCKER_REPO}
DOCKER_PASSWORD_FILE := "$(HOME)/.docker/$(DOCKER_ACCOUNT).password"


THIS_SERVICE_ROOT=$(shell pwd)
SERVICES_ROOT=$(shell dirname ${THIS_SERVICE_ROOT})
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)


DOCKER_BASE_IMAGE?=uscictdocker/mentorpal-classifier
DOCKER_BASE_IMAGE_ID=$(shell docker images -q ${DOCKER_BASE_IMAGE} 2> /dev/null)

.PHONY: docker-build-base
docker-build-base:
	cd ../classifier && \
		$(MAKE) docker-build DOCKER_IMAGE=${DOCKER_BASE_IMAGE}


.PHONY: docker-build
docker-build:
ifeq ("${DOCKER_BASE_IMAGE_ID}", "")
	@echo "base image not found, building..."
	$(MAKE) docker-build-base
else
	@echo "Found base image with id '${DOCKER_BASE_IMAGE_ID}'"
endif
	docker build \
		-t ${DOCKER_IMAGE} \
		--build-arg MENTORPAL_CLASSIFIER_IMAGE=${DOCKER_BASE_IMAGE} \
	.

# docker-login
#
# Tries to ensure user is logged in to docker image repo (dockerhub by default)
# as  user DOCKER_USER.
#
# Will trigger an interactive prompt for password *unless* user has stored
# their password in ~/.docker/$(DOCKER_USER).password
# e.g. echo mypasswordhere > ~/.docker/uscict.password && chmod 600 ~/.docker/uscict.password
.PHONY: docker-login
docker-login:
ifneq ("$(wildcard $(DOCKER_PASSWORD_FILE))","")
	@echo "store your docker password at $(DOCKER_PASSWORD_FILE) so you won't have to enter it again"
	docker login -u $(DOCKER_ACCOUNT)
else
	cat $(DOCKER_PASSWORD_FILE) | docker login -u $(DOCKER_ACCOUNT) --password-stdin
endif


.PHONY: docker-push-tag
docker-push-tag: docker-login
	docker push $(DOCKER_IMAGE)


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