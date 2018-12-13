#
# Phony targets.
#
.PHONY: help

PKG_VERSION ?= $(shell node -p "require('./website_version/package.json').version")
PKG_NAME ?= $(shell node -p "require('./website_version/package.json').name")

GIT_STATUS = $(shell git status -s)
GIT_TAG ?= $(PKG_NAME)-$(PKG_VERSION)
GIT_REPO ?= https://github.com/benjamid/MentorPAL
GIT_API_PATH ?= tree/master/website_version
GIT_URL := ${GIT_REPO}/tags/${GIT_TAG}/${GIT_API_PATH}

DOCKER_USER ?= uscictdocker
DOCKER_PASSWORD_FILE := "$(HOME)/.docker/$(DOCKER_USER).password"
DOCKER_IMAGE_NAME ?= mentor-pal-web
DOCKER_IMAGE_TAG ?= $(DOCKER_USER)/$(DOCKER_IMAGE_NAME):$(EB_ENV)-$(GIT_TAG)

DATE := $(shell date +"%Y%m%dT%H%M")
EB_ENV ?= MentorpalWeb-env
EB_ARCHIVE_FILE := $(subst /,-,$(GIT_TAG))
EB_ARCHIVE_FILE := $(EB_ENV)-$(subst :,-,$(GIT_TAG))-$(DATE).zip

NODE_ENV ?= dev
CURDIR = $(shell pwd)

clean:
	@rm -rf build dist *.zip

checkout-build-tag:
	git clone $(GIT_URL) build

build-tag-node: checkout-build-tag
	cp website_version/.env* build/website_version
	cd build && \
	docker build --no-cache --build-arg NODE_ENV=$(NODE_ENV) -t $(DOCKER_IMAGE_TAG) .

eb-build-tag: checkout-build-tag
	cd build && \
	sed -e s/\{\{DOCKER_IMAGE_TAG\}\}/$(subst /,\\/,$(DOCKER_IMAGE_TAG))/ \
		Dockerrun.aws.json.dist > Dockerrun.aws.json

# Tries to ensure user is logged in to docker image repo (dockerhub by default)
# as  user DOCKER_USER.
#
# Will trigger an interactive prompt for password *unless* user has stored
# their password in ~/.docker/$(DOCKER_USER).password
# e.g. echo mypasswordhere > ~/.docker/uscict.password && chmod 600 ~/.docker/uscict.password
docker-login:
ifneq ("$(wildcard $(DOCKER_PASSWORD_FILE))","")
	@echo "store your docker password at $(DOCKER_PASSWORD_FILE) so you won't have to enter it again"
	docker login -u $(DOCKER_USER)
else
	cat $(DOCKER_PASSWORD_FILE) | docker login -u $(DOCKER_USER) --password-stdin
endif

docker-deploy-tag: build-tag-node docker-login
	docker push $(DOCKER_IMAGE_TAG)

eb-dist: build-tag-node eb-build-tag
	mkdir -p dist/.elasticbeanstalk && \
	cd build && \
	zip ../dist/$(EB_ARCHIVE_FILE) Dockerrun.aws.json && \
	cp ../.elasticbeanstalk/*.yml ../dist/.elasticbeanstalk && \
	printf "\ndeploy:\n  artifact: %s\n" $(EB_ARCHIVE_FILE) \
		>> ../dist/.elasticbeanstalk/config.yml

eb-deploy: eb-dist docker-deploy-tag
	cd dist && \
	eb use $(EB_ENV) && eb deploy

# eb-cli-init
#
# Init the AWS Elastic Beanstalk CLI tool.
#
# No make 'deploy' recipes will work without first initing tool
eb-cli-init:
	eb init -i

ssh:
	eb use $(EB_ENV) && eb ssh

version:
ifneq ("$(GIT_STATUS)","")
	@echo "git working copy has local changes. Cannot tag version"
	exit 1
endif
	git tag $(GIT_TAG)
	cd website_version
	npm version patch

run-local:
	docker run \
	  -it \
	  --rm \
	  -u 0 \
	  -p:3000:3000 \
	  --name mentor-pal-web \
	  -e NODE_ENV=dev \
		--mount type=bind,source=$(CURDIR),target=/docker_host \
	  $(DOCKER_IMAGE_TAG)

docker-tag:
	docker build --no-cache --build-arg NODE_ENV=$(NODE_ENV) -t $(DOCKER_IMAGE_TAG) .

eb-build:
	mkdir -p build && \
	cd build && \
	sed -e s/\{\{DOCKER_IMAGE_TAG\}\}/$(subst /,\\/,$(DOCKER_IMAGE_TAG))/ \
		../Dockerrun.aws.json.dist > Dockerrun.aws.json
