DOCKER_USER ?= uscictdocker
DOCKER_IMAGE ?= mentorpal-web
DOCKER_IMAGE_TAG ?= $(DOCKER_USER)/$(DOCKER_IMAGE):$(EB_ENV)
DOCKER_PASSWORD_FILE := "$(HOME)/.docker/$(DOCKER_USER).password"

WEB_ROOT=$(shell pwd)
MENTORPAL_ROOT=$(shell dirname ${WEB_ROOT})

NODE_ENV ?= qa
EB_ENV ?= mentorpal-$(NODE_ENV)
EB_ARCHIVE_FILE := $(EB_ENV)-$(DATE).zip

PKG_VERSION ?= $(shell node -p "require('./package.json').version")
PKG_NAME ?= $(shell node -p "require('./package.json').name")

CHECKPOINT=2019-2-21-220
DATE := $(shell date +"%Y%m%dT%H%M")

remove-checkpoints:
	rm -r ${MENTORPAL_ROOT}/checkpoint/classifiers/*/*/*/*
	rm -r ${MENTORPAL_ROOT}/checkpoint/vector_models/*.bin

init-checkpoint:
	make download-checkpoint classifier=lstm_v1 checkpoint=${CHECKPOINT}
	make download-vector-models

clean:
	rm -rf build dist *.zip

build: clean
	mkdir -p ${WEB_ROOT}/build

	cp -r ${MENTORPAL_ROOT}/website_version/* ${WEB_ROOT}/build
	cp -r ${MENTORPAL_ROOT}/src ${WEB_ROOT}/build
	cp -r ${MENTORPAL_ROOT}/mentors ${WEB_ROOT}/build
	cp -r ${MENTORPAL_ROOT}/checkpoint ${WEB_ROOT}/build

	cp ${MENTORPAL_ROOT}/.netrc ${WEB_ROOT}/build
	cp ${WEB_ROOT}/Dockerrun.aws.json.dist ${WEB_ROOT}/build
	cp ${WEB_ROOT}/package.json ${WEB_ROOT}/build
	cp ${WEB_ROOT}/password.txt ${WEB_ROOT}/build

	cp ${MENTORPAL_ROOT}/mentors/clint/data/* ${WEB_ROOT}/build/public/clint
	cp ${MENTORPAL_ROOT}/mentors/dan/data/* ${WEB_ROOT}/build/public/dan
	cp ${MENTORPAL_ROOT}/mentors/carlos/data/* ${WEB_ROOT}/build/public/carlos
	cp ${MENTORPAL_ROOT}/mentors/julianne/data/* ${WEB_ROOT}/build/public/julianne

local-run: build
	cd build && \
	npm install && \
	node app dev

docker-build: build
	docker build --no-cache --build-arg NODE_ENV=$(NODE_ENV) CHECKPOINT=${CHECKPOINT} -t ${DOCKER_IMAGE_TAG} .

docker-run:
	docker run \
			-it \
			--rm \
			--name mentor-pal-website \
			-p:3000:3000 \
			-u 0 \
			-e NODE_ENV=dev \
			--mount type=bind,source=$(WEB_ROOT),target=/docker_host \
			$(DOCKER_IMAGE_TAG) \
				bash

docker-login:
ifneq ("$(wildcard $(DOCKER_PASSWORD_FILE))","")
	@echo "store your docker password at $(DOCKER_PASSWORD_FILE) so you won't have to enter it again"
	docker login -u $(DOCKER_USER)
else
	cat $(DOCKER_PASSWORD_FILE) | docker login -u $(DOCKER_USER) --password-stdin
endif

eb-build-tag: build
	cd build && \
	sed -e s/\{\{DOCKER_IMAGE_TAG\}\}/$(subst /,\\/,$(DOCKER_IMAGE_TAG))/ \
		Dockerrun.aws.json.dist > Dockerrun.aws.json

docker-deploy-tag: docker-build docker-login
	docker push $(DOCKER_IMAGE_TAG)

eb-dist: docker-build eb-build-tag
	mkdir -p dist/.elasticbeanstalk && \
	cd build && \
	zip ../dist/$(EB_ARCHIVE_FILE) Dockerrun.aws.json && \
	cp ../.elasticbeanstalk/*.yml ../dist/.elasticbeanstalk && \
	printf "\ndeploy:\n  artifact: %s\n" $(EB_ARCHIVE_FILE) \
		>> ../dist/.elasticbeanstalk/config.yml

eb-deploy: eb-dist docker-deploy-tag
	cd dist && \
	eb use $(EB_ENV) && eb deploy

eb-deploy-prod: NODE_ENV=prod
eb-deploy-prod: eb-deploy

eb-deploy-qa: NODE_ENV=qa
eb-deploy-qa: eb-deploy

eb-cli-init:
	eb init -i

ssh:
	eb use $(EB_ENV) && eb ssh