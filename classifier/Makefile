SHELL:=/bin/bash
DOCKER_IMAGE?=mentorpal-classifier
DOCKER_CONTAINER=mentorpal-classifier
CLASSIFIER_ROOT=$(shell pwd)
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
PWD=$(shell pwd)

docker-build:
	docker build -t $(DOCKER_IMAGE) .

# virtualenv used for pytest
TEST_VIRTUAL_ENV=.venv
$(TEST_VIRTUAL_ENV):
	$(MAKE) test-env-create

.PHONY: test-env-create
test-env-create: virtualenv-installed
	[ -d $(TEST_VIRTUAL_ENV) ] || virtualenv -p python3 $(TEST_VIRTUAL_ENV)
	$(TEST_VIRTUAL_ENV)/bin/pip install --upgrade pip
	$(TEST_VIRTUAL_ENV)/bin/pip install -r ./requirements.txt
	$(TEST_VIRTUAL_ENV)/bin/pip install -r ./requirements.test.txt

virtualenv-installed:
	$(PROJECT_ROOT)/bin/virtualenv_ensure_installed.sh

PHONY: test
test: $(TEST_VIRTUAL_ENV)
	export PYTHONPATH=$(shell echo $${PYTHONPATH}):$(PWD)/src && \
	$(TEST_VIRTUAL_ENV)/bin/py.test -vv $(args)

virtualenv-installed:
	$(PROJECT_ROOT)/bin/virtualenv_ensure_installed.sh