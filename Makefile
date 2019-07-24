SHELL:=/bin/bash
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
DOCKER_SERVICES=$(PROJECT_ROOT)/bin/docker_services.sh
DEV_VIRTUAL_ENV=.venv
BLACK_EXCLUDES="/(\.venv|build|behave-restful)/"

$(DEV_VIRTUAL_ENV):
	$(MAKE) dev-env-create

.PHONY: dev-env-create
dev-env-create:
	[ -d $(DEV_VIRTUAL_ENV) ] || virtualenv -p python3 $(DEV_VIRTUAL_ENV)
	$(DEV_VIRTUAL_ENV)/bin/pip install --upgrade pip
	$(DEV_VIRTUAL_ENV)/bin/pip install -r dev-env/requirements.txt



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
local-run: $(DEV_VIRTUAL_ENV)
	$(DEV_VIRTUAL_ENV)/bin/docker-compose up


.PHONY: local-stop
local-stop: $(DEV_VIRTUAL_ENV)
	$(DEV_VIRTUAL_ENV)/bin/docker-compose down

.PHONY: format-python
format-python: $(DEV_VIRTUAL_ENV)
	$(DEV_VIRTUAL_ENV)/bin/black --exclude $(BLACK_EXCLUDES) .

.PHONY: format
format:
	$(MAKE) format-python
	$(MAKE) format-js

.PHONY: test-format-python
test-format-python: $(DEV_VIRTUAL_ENV)
	$(DEV_VIRTUAL_ENV)/bin/black --check --exclude $(BLACK_EXCLUDES) .

node_modules/prettier:
	npm install

.PHONY: format-js
format-js: node_modules/prettier
	@echo "FORMAT JS!"
	npm run format

.PHONY: test-format-js
test-format-js: node_modules/prettier
	npm run test:format

.PHONY: test-format
test-format: test-format-python test-format-js

.PHONY: lint-python
lint-python: $(DEV_VIRTUAL_ENV)
	$(DEV_VIRTUAL_ENV)/bin/flake8 .

.PHONY: test
test:
	cd services/mentor-api && \
		$(MAKE) test

.PHONY: test-images
test-images:
	cd services/mentor-api && \
		$(MAKE) test-image

.PHONY: audit-js
audit-js:
	cd client/MentorPanel && npm run test:audit
	cd services/web-app && $(MAKE) audit-js