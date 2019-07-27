SHELL:=/bin/bash
DOCKER_IMAGE?=mentorpal-web-app
DOCKER_PASSWORD_FILE := "$(HOME)/.docker/$(DOCKER_ACCOUNT).password"
DOCKER_CONTAINER=mentorpal-web-app
DIR=$(shell pwd)
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
PROJECT_NAME=$(shell v='$(PROJECT_ROOT)'; echo "$${v\#\#*/}")
SERVICE_NAME=$(shell v='$(DIR)'; echo "$${v\#\#*/}")
CLIENT=$(PROJECT_ROOT)/client
BUILD=$(DIR)/build


.PHONY clean:
clean:
	rm -rf build


build/client:
	mkdir -p build
	rsync -rv --exclude=node_modules $(CLIENT) build


.PHONY docker-build:
docker-build: clean build/client
	docker build \
		-t $(DOCKER_IMAGE) \
	.

.PHONY docker-run:
docker-run:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-p 3000:3000 \
		$(DOCKER_IMAGE) 


.PHONY docker-run-dev:
docker-run-dev:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-p 3000:3000 \
			-v $(SERVICE_ROOT)/bin:/app/bin \
			-v $(SERVICE_ROOT)/public:/app/public \
			-v $(SERVICE_ROOT)/routes:/app/routes \
			-v $(SERVICE_ROOT)/views:/app/views \
			-v $(SERVICE_ROOT)/utils:/app/utils \
		${DOCKER_IMAGE} 


.PHONY exec-shell:
exec-shell:
	docker exec \
			-it \
		$(DOCKER_CONTAINER) \
			bash

.PHONY: audit-js
audit-js:
	npm run test:audit