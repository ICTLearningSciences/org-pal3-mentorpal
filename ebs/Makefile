# TODO:
#   - disallow deploy if local changes in repo

.PHONY: clean 

SHELL:=/bin/bash

CURDIR=$(shell pwd)
PROJECT_ROOT=$(shell dirname ${CURDIR})

EB_APP ?= mentorpal
EB_ENV ?= qa-mentorpal
EB_REGION ?= us-east-1
EB_PROFILE ?= eb-cli-${EB_APP}


# GIT_BRANCH := $(shell git rev-parse --abbrev-ref HEAD)
GIT_HASH := $(shell git rev-parse HEAD)
GIT_STATUS = $(shell git status -s)
GIT_TAG ?= v
# GIT_REPO ?= https://github.com/benjamid/MentorPAL
GIT_REPO_USER=beatthat
GIT_REPO=MentorPAL

DOCKER_ACCOUNT ?= uscictdocker
DOCKER_PASSWORD_FILE := "$(HOME)/.docker/$(DOCKER_ACCOUNT).password"

DOCKER_WEB_APP_TAG ?= $(DOCKER_ACCOUNT)/mentorpal-web-app:$(GIT_HASH)
DOCKER_MENTOR_API_TAG ?= $(DOCKER_ACCOUNT)/mentorpal-mentor-api:$(GIT_HASH)
DOCKER_PROXY_TAG ?= $(DOCKER_ACCOUNT)/mentorpal-proxy:$(GIT_HASH)
DOCKER_CLASSIFIER_BASE_TAG ?= $(DOCKER_ACCOUNT)/mentorpal-classifier:$(GIT_HASH)

DATE := $(shell date +"%Y%m%dT%H%M")


# git-no-local-changes:
# 	git diff --quiet && git diff --cached --quiet

###############################################################################
# config/secret.properties is where we store passwords for the app
# This file should NEVER be committed to VC
# but a user does need one to run the server locally or to deploy.
###############################################################################
SECRET_PROPERTIES_PATH=config/secrets.properties
SECRET_PROPERTIES=${PROJECT_ROOT}/${SECRET_PROPERTIES_PATH}

##############################################################################
# This rule, gives user an explanatory message if config/secret.properties
# is missing from their clone
##############################################################################
${SECRET_PROPERTIES}:
	@echo "you must create a secret.properties file at path ${SECRET_PROPERTIES}"
	@echo "...and it must contain these props:"
	@cat config/dist.secrets.properties
	exit 1

clean:
	rm -rf build

##############################################################################
# Deployment to EBS will be constructed from a clone
# of the local-clone commit hash
##############################################################################
build/clone: ${SECRET_PROPERTIES}
	mkdir -p build && \
		cd build && \
		wget https://github.com/${GIT_REPO_USER}/${GIT_REPO}/archive/${GIT_HASH}.zip -O clone.zip && \
		unzip clone.zip -d clone && mv clone/*/* clone && \
		cp ${PROJECT_ROOT}/.netrc clone && \
		rm clone.zip

##############################################################################
# We must copy over the (unversioned) config/secret.properties
# to build/clone/config/secret.properties
##############################################################################
CLONE_SECRET_PROPERTIES=build/clone/${SECRET_PROPERTIES_PATH}
${CLONE_SECRET_PROPERTIES}: build/clone ${SECRET_PROPERTIES}
	cp ${SECRET_PROPERTIES} build/clone/${SECRET_PROPERTIES_PATH}

##############################################################################
# Create a properties file that will be used to configure the final
# build/ebs/.elasticbeantstalk/config.yml
##############################################################################
build/ebs/config.properties: build/clone
	mkdir -p build/ebs

	@echo "EB_REGION=${EB_REGION}" > build/ebs/config.properties
	@echo "EB_APP=${EB_APP}" >> build/ebs/config.properties
	@echo "EB_ENV=${EB_ENV}" >> build/ebs/config.properties
	@echo "EB_PROFILE=${EB_PROFILE}" >> build/ebs/config.properties
	@echo "EB_BUNDLE_ZIP=${EB_BUNDLE_ZIP}" >> build/ebs/config.properties
	@echo "" >> build/ebs/config.properties


##############################################################################
# The contents of build/ebs/.elasticbeanstalk/config.yml
# will control the deployment to EBS
##############################################################################
build/ebs/.elasticbeanstalk/config.yml: build/ebs/config.properties
	mkdir -p build/ebs/.elasticbeanstalk

	cp build/clone/ebs/.elasticbeanstalk/config.yml build/ebs/.elasticbeanstalk

	python build/clone/bin/apply_properties.py \
		build/ebs/config.properties \
		build/ebs/.elasticbeanstalk/config.yml


##############################################################################
# Create a properties file that will be used to configure the final
# build/ebs/bundle/Dockerrun.aws.json
##############################################################################
build/ebs/Dockerrun.aws.properties: build/clone
	mkdir -p build/ebs

	@echo "MENTOR_API_IMAGE_TAG=${DOCKER_MENTOR_API_TAG}" > build/ebs/Dockerrun.aws.properties
	@echo "WEB_APP_IMAGE_TAG=${DOCKER_WEB_APP_TAG}" >> build/ebs/Dockerrun.aws.properties
	@echo "PROXY_IMAGE_TAG=${DOCKER_PROXY_TAG}" >> build/ebs/Dockerrun.aws.properties
	@echo "" >> build/ebs/Dockerrun.aws.properties

##############################################################################
# build/ebs/bundle is what gets bundled and deployed to EBS.
# Centrally, it contains Dockerrun.aws.json
# It will be populated with config and secrets, then zipped 
# into an archive and published to EBS
##############################################################################
build/ebs/bundle: build/ebs/Dockerrun.aws.properties
	mkdir -p build/ebs
	cp -r build/clone/ebs/bundle build/ebs/bundle

	python build/clone/bin/apply_properties.py \
		${SECRET_PROPERTIES} \
		build/ebs/bundle/Dockerrun.aws.json

	python build/clone/bin/apply_properties.py \
		build/ebs/Dockerrun.aws.properties \
		build/ebs/bundle/Dockerrun.aws.json

##############################################################################
# build/ebs/{bundle-name}.zip is the actual file that gets published
# to EBS. It will contain Dockerrun.aws.json
##############################################################################
EB_BUNDLE_ZIP := $(EB_ENV)-$(GIT_HASH).zip
${EB_BUNDLE_ZIP}: build/ebs/.elasticbeanstalk/config.yml build/ebs/bundle
	cd build/ebs/bundle && \
		zip ../${EB_BUNDLE_ZIP} -r *


build: build/clone ${CLONE_SECRET_PROPERTIES} build/ebs/.elasticbeanstalk build/ebs/bundle

##############################################################################
# Build docker images for the services we're about to publish to ebs.
# These images will be tagged with the git commit hash 
# that we have cloned into build/clone
##############################################################################
docker-build-tags: build/clone
	cd build/clone/services/classifier && \
		$(MAKE) docker-build DOCKER_IMAGE=${DOCKER_CLASSIFIER_BASE_TAG}

	cd build/clone/services/mentor-api && \
		$(MAKE) docker-build DOCKER_IMAGE=${DOCKER_MENTOR_API_TAG} DOCKER_BASE_IMAGE=${DOCKER_CLASSIFIER_BASE_TAG}

	cd build/clone/services/web_app && \
		$(MAKE) docker-build DOCKER_IMAGE=${DOCKER_WEB_APP_TAG}
	
	cd build/clone/services/proxy && \
		$(MAKE) docker-build DOCKER_IMAGE=${DOCKER_PROXY_TAG}


##############################################################################
#
# Tries to ensure user is logged in to docker image repo (dockerhub by default)
# as  user DOCKER_USER.
#
# Will trigger an interactive prompt for password *unless* user has stored
# their password in ~/.docker/$(DOCKER_USER).password
#
# e.g. echo mypasswordhere > ~/.docker/uscict.password && chmod 600 ~/.docker/uscict.password
##############################################################################
docker-login:
ifneq ("$(wildcard $(DOCKER_PASSWORD_FILE))","")
	@echo "store your docker password at $(DOCKER_PASSWORD_FILE) so you won't have to enter it again"
	docker login -u $(DOCKER_ACCOUNT)
else
	cat $(DOCKER_PASSWORD_FILE) | docker login -u $(DOCKER_ACCOUNT) --password-stdin
endif

##############################################################################
# Push docker images (to dockerhub.io) for the services we're about to publish to ebs.
# These images will be tagged with the git commit hash 
# that we have cloned into build/clone
##############################################################################
docker-push-tags: docker-login
	docker push ${DOCKER_CLASSIFIER_BASE_TAG}
	docker push ${DOCKER_MENTOR_API_TAG}
	docker push ${DOCKER_WEB_APP_TAG}
	docker push ${DOCKER_PROXY_TAG}

# eb-cli-init: build/ebs/.elasticbeanstalk/config.yml
# 	cd build/ebs && \
# 		eb init -i

eb-deploy: ${EB_BUNDLE_ZIP}
	cd build/ebs && \
		eb use $(EB_ENV) && \
		eb deploy