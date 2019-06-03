PROJECT_ROOT=$(shell git rev-parse --show-toplevel 2> /dev/null)
DOCKER_SERVICES=$(PROJECT_ROOT)/bin/docker_services.sh
DOCKER_ACCOUNT?=uscictdocker
DOCKER_TAG?=latest
DEV_ENV=mentorpal-dev

.PHONY: dev-env-create
dev-env-create:
	cd dev-env && \
		./create.sh ${DEV_ENV}

.PHONY: docker-build-services
docker-build-services:
	$(DOCKER_SERVICES) --tag $(DOCKER_TAG) --account $(DOCKER_ACCOUNT) build

.PHONY: docker-push-tags-no-build
docker-push-tags-no-build:
	cd services/web-app && \
		$(MAKE) docker-push-tag
	
	cd services/mentor-api && \
		$(MAKE) docker-push-tag


# TODO: deploy process should...
# 1) fail if any service's repo not committed
# 2) create a git tag w [qa|prod]-${timestamp}
# 3) build and push a docker image with same tag as the git tag
# 4) build docker-compose config (EB version) with correct image tags, secrets, and config
# 5) push tags to docker
# 6) deploy to eb

.PHONY: clean
clean:
	rm -rf build

###############################################################################
# config/config.properties is where we non-sensitive default config for the app
###############################################################################
CONFIG_PROPERTIES=config/config.properties


###############################################################################
# config/secret.properties is where we store passwords for the app
# This file should NEVER be committed to VC
# but a user does need one to run the server locally or to deploy.
###############################################################################
SECRET_PROPERTIES=config/secrets.properties

###############################################################################
# This rule, gives user an explanatory message if config/secret.properties
# is missing from their clone
###############################################################################
${SECRET_PROPERTIES}:
	@echo "you must create a secret.properties file at path ${SECRET_PROPERTIES}"
	@echo "...and it must contain these props:"
	@cat config/dist.secrets.properties
	exit 1

###############################################################################
# Builds a docker-compose.yml for running locally 
# with secrets and other config set
###############################################################################
DOCKER_COMPOSE_BUILD=build/docker-compose.yml
${DOCKER_COMPOSE_BUILD}: ${SECRET_PROPERTIES}
	mkdir -p build
	cp docker-compose-template.yml build/docker-compose.yml

	python bin/apply_properties.py \
		${SECRET_PROPERTIES} \
		build/*.yml

	python bin/apply_properties.py \
		${CONFIG_PROPERTIES} \
		build/*.yml

###############################################################################
# Run the app locally with 'docker-compose up'
# Does NOT clean the existing build directory first (if one exists)
# Once the server is running, you can open the local site in a browser at
# http://localhost:8080
###############################################################################
.PHONY: local-run-no-rebuild
local-run-no-rebuild: ${DOCKER_COMPOSE_BUILD}
	source activate ${DEV_ENV} && \
		cd build && \
		docker-compose up
	
	
###############################################################################
# Run the app locally with 'docker-compose up'
# with a clean build of docker-compose.yml
# (updated secrets and config)
# Once the server is running, you can open the local site in a browser at
# http://localhost:8080
###############################################################################
.PHONY: local-run
local-run: clean local-run-no-rebuild


.PHONY: local-stop
local-stop: 
	source activate ${DEV_ENV} && \
		cd build && \
		docker-compose down

