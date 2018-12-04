#
# Phony targets.
#
.PHONY: help


DATE := $(shell date +"%Y%m%dT%H%M")

CURDIR = $(shell pwd)

NODE_ENV =? production

GIT_TAG ?= 1.0

DOCKER_USER ?= uscictdocker
DOCKER_PASSWORD_FILE := "$(HOME)/.docker/$(DOCKER_USER).password"
DOCKER_IMAGE_NAME ?= mentor-pal-web
DOCKER_IMAGE_TAG ?= $(DOCKER_USER)/$(DOCKER_IMAGE_NAME):$(EB_ENV)-$(GIT_TAG)


# name of the elastic beanstalk env we will deploy to
EB_ENV ?= MentorpalWeb-env
EB_ARCHIVE_FILE := $(subst /,-,$(GIT_TAG))
EB_ARCHIVE_FILE := $(EB_ENV)-$(subst :,-,$(GIT_TAG))-$(DATE).zip

clean:
	@rm -rf build dist *.zip

run-local:
	docker run \
	  -it \
	  --rm \
	  -u 0 \
	  -p:8000:8000 \
	  --name mentor-pal-web \
	  -e NODE_ENV=dev \
		--mount type=bind,source=$(CURDIR),target=/docker_host \
	  mentor-pal-web bash


docker-tag:
	docker build -t $(DOCKER_IMAGE_TAG) .

# docker-login
#
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

# deploy a tagged image of
deploy-docker-tag: docker-login
	docker push $(DOCKER_IMAGE_TAG)

eb-build:
	mkdir -p build && \
	cd build && \
	sed -e s/\{\{DOCKER_IMAGE_TAG\}\}/$(subst /,\\/,$(DOCKER_IMAGE_TAG))/ \
		../Dockerrun.aws.json.dist > Dockerrun.aws.json

eb-dist: eb-build
	mkdir -p dist/.elasticbeanstalk && \
	cd build && \
	zip ../dist/$(EB_ARCHIVE_FILE) Dockerrun.aws.json && \
	cp ../.elasticbeanstalk/*.yml ../dist/.elasticbeanstalk && \
	printf "\ndeploy:\n  artifact: %s\n" $(EB_ARCHIVE_FILE) \
		>> ../dist/.elasticbeanstalk/config.yml

eb-deploy: #eb-dist deploy-docker-tag
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
