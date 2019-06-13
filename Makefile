PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
DOCKER_SERVICES=$(PROJECT_ROOT)/bin/docker_services.sh
DEV_ENV=mentorpal-dev

.PHONY: dev-env-create
dev-env-create:
	cd dev-env && \
		./create.sh ${DEV_ENV}


.PHONY: docker-build-classifier
docker-build-classifier:
	cd classifier && $(MAKE) docker-build


.PHONY: docker-build-services
docker-build-services: docker-build-classifier
	$(DOCKER_SERVICES) build

	
###############################################################################
# Run the app locally with 'docker-compose up'
# with a clean build of docker-compose.yml
# (updated secrets and config)
# Once the server is running, you can open the local site in a browser at
# http://localhost:8080
###############################################################################
.PHONY: local-run
local-run:
	source activate ${DEV_ENV} && \
		docker-compose up


.PHONY: local-stop
local-stop: 
	source activate ${DEV_ENV} && \
		docker-compose down
