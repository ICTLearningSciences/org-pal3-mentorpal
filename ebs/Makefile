# TODO:
#   - disallow deploy if local changes in repo

SHELL:=/bin/bash

CURDIR=$(shell pwd)
PROJECT_ROOT=$(shell git rev-parse --show-toplevel 2> /dev/null)
PROJECT_NAME=$(shell basename "$(PROJECT_ROOT)" | tr [:upper:] [:lower:])
BUILD=$(CURDIR)/build
CONFIG=$(PROJECT_ROOT)/config
HOME_DIR=$(shell cd ~; pwd)

GIT_BRANCH:=$(shell git rev-parse --abbrev-ref HEAD)
GIT_HASH:=$(shell git rev-parse HEAD)
GIT_STATUS=$(shell git status -s)

###############################################################################
# There should be an Elastic Beanstalk app having
# the same name (lower case) as this project.
# This helps enable eb rules that work withouthand configuration.
###############################################################################
EB_APP?=$(PROJECT_NAME)

###############################################################################
# eb-deploy will by default deploy to an Elastic Beanstalk environment
# having the same name as the locally checked out branch.
# This helps enable eb rules that work withouthand configuration.
###############################################################################
EB_ENV?=$(GIT_BRANCH)

EB_REGION?=us-east-1

###############################################################################
# eb-deploy will by default look for a profile (credentials)
# having the name of the Elastic Beanstalk app with the prefix 'eb-cli'
# This helps enable eb rules that work withouthand configuration.
###############################################################################
EB_PROFILE?=eb-cli-$(EB_APP)

AWS_CONFIG=$(HOME_DIR)/.aws/config

DOCKER_ACCOUNT?=uscictdocker
DOCKER_PASSWORD_FILE:="$(HOME)/.docker/$(DOCKER_ACCOUNT).password"
DOCKER_SERVICES=$(PROJECT_ROOT)/bin/docker_services.sh

DATE:=$(shell date +"%Y%m%dT%H%M")

VENV=$(EB_APP)-ebs


.PHONY: venv-create
venv-create:
	cd venv && \
		./create.sh -f -n $(VENV)


.PHONY: venv-exists
venv-exists:
	cd venv && \
		./create.sh -n $(VENV)
	

EB=eb

###############################################################################
# config/secret.properties is where we store passwords for the app
# This file should NEVER be committed to VC
# but a user does need one to run the server locally or to deploy.
###############################################################################
SECRET_PROPERTIES_PATH=config/secrets.properties
SECRET_PROPERTIES=$(PROJECT_ROOT)/$(SECRET_PROPERTIES_PATH)


##############################################################################
# This rule, gives user an explanatory message if config/secret.properties
# is missing from their clone
##############################################################################
$(SECRET_PROPERTIES):
ifneq ("$(wildcard "config/dist.secrets.properties")","")
	@echo "you must create a secret.properties file at path $(SECRET_PROPERTIES)"
	@echo "...and it must contain these props:"
	@cat config/dist.secrets.properties
	exit 1
else
	@mkdir -p $(shell dirname $(SECRET_PROPERTIES)) && \
		echo "" >> $(SECRET_PROPERTIES)
endif

clean:
	rm -rf build

##############################################################################
# Deployment to EBS will be constructed from a clone
# of the local-clone commit hash
##############################################################################
build/clone: venv-exists $(SECRET_PROPERTIES)
	source activate $(VENV) && \
		mkdir -p build && \
		cd $(PROJECT_ROOT) && \
		git archive --format zip --output $(BUILD)/clone.zip $(GIT_HASH) && \
		cd $(BUILD) && \
		unzip clone.zip -d clone && \
	 	rm clone.zip


##############################################################################
# We must copy over the (unversioned) config/secret.properties
# to build/clone/config/secret.properties
##############################################################################
CLONE_SECRET_PROPERTIES=build/clone/$(SECRET_PROPERTIES_PATH)
$(CLONE_SECRET_PROPERTIES): build/clone $(SECRET_PROPERTIES)
	cp $(SECRET_PROPERTIES) build/clone/$(SECRET_PROPERTIES_PATH)


##############################################################################
# Create a properties file that will be used to configure the final
# build/ebs/.elasticbeantstalk/config.yml
##############################################################################
build/ebs/config/.elasticbeanstalk_config.properties: build/clone
	mkdir -p build/ebs/config
	@echo "EB_REGION=$(EB_REGION)" > build/ebs/config/.elasticbeanstalk_config.properties
	@echo "EB_APP=$(EB_APP)" >> build/ebs/config/.elasticbeanstalk_config.properties
	@echo "EB_ENV=$(EB_ENV)" >> build/ebs/config/.elasticbeanstalk_config.properties
	@echo "EB_PROFILE=$(EB_PROFILE)" >> build/ebs/config/.elasticbeanstalk_config.properties
	@echo "EB_BUNDLE_ZIP=$(EB_BUNDLE_ZIP)" >> build/ebs/config/.elasticbeanstalk_config.properties
	@echo "" >> build/ebs/config/.elasticbeanstalk_config.properties


##############################################################################
# Create a properties file that will be used to configure the final
# build/ebs/bundle/Dockerrun.aws.json
##############################################################################
build/ebs/config/Dockerrun.aws.properties: build/clone
	mkdir -p build/ebs/config
	$(DOCKER_SERVICES) \
			--account $(DOCKER_ACCOUNT) \
			--tag $(GIT_HASH) \
			-o $(BUILD)/ebs/config/Dockerrun.aws.properties \
		properties

build/ebs/config: build/ebs/config/Dockerrun.aws.properties build/ebs/config/.elasticbeanstalk_config.properties

##############################################################################
# The contents of build/ebs/.elasticbeanstalk/config.yml
# will control the deployment to EBS
##############################################################################
build/ebs/.elasticbeanstalk/config.yml: venv-exists build/ebs/config/.elasticbeanstalk_config.properties
	mkdir -p build/ebs

	cp -r build/clone/ebs/.elasticbeanstalk build/ebs/.elasticbeanstalk

	source activate $(VENV) && \
		python bin/apply_properties.py \
			$(BUILD)/ebs/config/.elasticbeanstalk_config.properties \
			$(BUILD)/ebs/.elasticbeanstalk/config.yml


build/ebs/.elasticbeanstalk: build/ebs/.elasticbeanstalk/config.yml


##############################################################################
# build/ebs/bundle is what gets bundled and deployed to EBS.
# Centrally, it contains Dockerrun.aws.json
# It will be populated with config and secrets, then zipped 
# into an archive and published to EBS
##############################################################################
build/ebs/bundle: venv-exists build/ebs/config/Dockerrun.aws.properties
	mkdir -p build/ebs
	cp -r build/clone/ebs/bundle build/ebs/bundle

	source activate $(VENV) && \
		python bin/apply_properties.py \
			$(SECRET_PROPERTIES) \
			$(BUILD)/ebs/bundle/Dockerrun.aws.json

	source activate $(VENV) && \
		python bin/apply_properties.py \
			$(BUILD)/ebs/config/Dockerrun.aws.properties \
			$(BUILD)/ebs/bundle/Dockerrun.aws.json


##############################################################################
# build/ebs/(bundle-name).zip is the actual file that gets published
# to EBS. It will contain Dockerrun.aws.json
##############################################################################
EB_BUNDLE_ZIP := $(EB_ENV)-$(GIT_HASH).zip
$(EB_BUNDLE_ZIP): venv-exists build/ebs/.elasticbeanstalk/config.yml build/ebs/bundle
	source activate $(VENV) && \
		cd build/ebs/bundle && \
			zip ../$(EB_BUNDLE_ZIP) -r *


build: build/clone venv-exists $(CLONE_SECRET_PROPERTIES) \
	build/ebs/config build/ebs/bundle build/ebs/.elasticbeanstalk

##############################################################################
# Build docker images for the services we're about to publish to ebs.
# These images will be tagged with the git commit hash 
# that we have cloned into build/clone
##############################################################################
.PHONY: docker-build 
docker-build: build/clone
	$(DOCKER_SERVICES) --account $(DOCKER_ACCOUNT) --tag $(GIT_HASH) build


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
.PHONY: docker-login 
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
.PHONY: docker-push 
docker-push: docker-login
	$(DOCKER_SERVICES) --account $(DOCKER_ACCOUNT) -t $(GIT_HASH) push


$(AWS_CONFIG):
	@echo "AWS Elastic Beanstalk:"
	@echo "  No credentials file at $(AWS_CONFIG)..."
	@echo "  Creating a stub credential with an entry for target $(EB_PROFILE) at $(AWS_CONFIG)..."
	echo "[$(EB_PROFILE)]" >> $(AWS_CONFIG)
	echo "aws_access_key_id = PLACEHOLDER" >> $(AWS_CONFIG)
	echo "aws_secret_access_key = PLACEHOLDER" >> $(AWS_CONFIG)
	echo "" >> $(AWS_CONFIG)


.PHONY: eb-deploy 
eb-deploy: venv-exists $(EB_BUNDLE_ZIP)
	source activate $(VENV) && \
		cd build/ebs && \
		$(EB) use $(EB_ENV) && \
		$(EB) deploy
