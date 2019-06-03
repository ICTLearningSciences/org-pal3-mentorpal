SHELL:=/bin/bash
DOCKER_ACCOUNT?=uscictdocker
DOCKER_REPO?=mentorpal-web-app
DOCKER_TAG?=latest
DOCKER_IMAGE?=${DOCKER_ACCOUNT}/${DOCKER_REPO}:${DOCKER_TAG}
DOCKER_PASSWORD_FILE := "$(HOME)/.docker/$(DOCKER_ACCOUNT).password"
DOCKER_CONTAINER=mentorpal-web-app
DIR=$(shell pwd)
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
PROJECT_NAME=$(shell v='$(PROJECT_ROOT)'; echo "$${v\#\#*/}")
SERVICE_NAME=$(shell v='$(DIR)'; echo "$${v\#\#*/}")
CLIENT=${PROJECT_ROOT}/client
BUILD=${DIR}/build


.PHONY clean:
clean:
	rm -rf build


build/client:
	mkdir -p build
	rsync -rv --exclude=node_modules ${CLIENT} build


.PHONY docker-build:
docker-build: clean build/client
	docker build \
		-t ${DOCKER_IMAGE} \
	.

# docker-login
#
# Tries to ensure user is logged in to docker image repo (dockerhub by default)
# as  user DOCKER_USER.
#
# Will trigger an interactive prompt for password *unless* user has stored
# their password in ~/.docker/$(DOCKER_USER).password
# e.g. echo mypasswordhere > ~/.docker/uscict.password && chmod 600 ~/.docker/uscict.password
.PHONY docker-build:
docker-login:
ifneq ("$(wildcard $(DOCKER_PASSWORD_FILE))","")
	@echo "store your docker password at $(DOCKER_PASSWORD_FILE) so you won't have to enter it again"
	docker login -u $(DOCKER_ACCOUNT)
else
	cat $(DOCKER_PASSWORD_FILE) | docker login -u $(DOCKER_ACCOUNT) --password-stdin
endif


.PHONY docker-push-tag:
docker-push-tag: docker-login
	docker push $(DOCKER_IMAGE)


.PHONY docker-run:
docker-run:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			-p 3000:3000 \
			-e WATSON_PASSWORD=${WATSON_PASSWORD} \
		${DOCKER_IMAGE} 


.PHONY docker-run-dev:
docker-run-dev:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			-p 3000:3000 \
			-v ${SERVICE_ROOT}/bin:/app/bin \
			-v ${SERVICE_ROOT}/public:/app/public \
			-v ${SERVICE_ROOT}/routes:/app/routes \
			-v ${SERVICE_ROOT}/views:/app/views \
			-v ${SERVICE_ROOT}/utils:/app/utils \
			-e WATSON_USER=${WATSON_USER} \
			-e WATSON_PASSWORD=${WATSON_PASSWORD} \
		${DOCKER_IMAGE} 


.PHONY exec-shell:
exec-shell:
	docker exec \
			-it \
		${DOCKER_CONTAINER} \
			bash
