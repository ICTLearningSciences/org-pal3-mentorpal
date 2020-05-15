PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)

virtualenv-installed:
	$(PROJECT_ROOT)/bin/virtualenv_ensure_installed.sh

BEHAVE_RESTFUL=$(PROJECT_ROOT)/behave-restful
$(BEHAVE_RESTFUL)/setup.py:
	@echo "initializing submodule behave-restful..."
	cd $(PROJECT_ROOT) && \
        git submodule init && \
        git submodule update --remote 


TEST_VIRTUAL_ENV=.venv
TEST_VIRTUAL_ENV_PIP=$(TEST_VIRTUAL_ENV)/bin/pip
$(TEST_VIRTUAL_ENV):
	$(MAKE) test-env-create

.PHONY: test-env-create
test-env-create: $(PROJECT_ROOT)/behave-restful/setup.py virtualenv-installed
	[ -d $(TEST_VIRTUAL_ENV) ] || virtualenv -p python3 $(TEST_VIRTUAL_ENV)
	$(TEST_VIRTUAL_ENV_PIP) install --upgrade pip
	$(TEST_VIRTUAL_ENV_PIP) install -r requirements.txt
	$(TEST_VIRTUAL_ENV_PIP) install -r $(BEHAVE_RESTFUL)/requirements.txt && \
	$(TEST_VIRTUAL_ENV_PIP) install -e $(BEHAVE_RESTFUL)

.PHONY: test
test: $(TEST_VIRTUAL_ENV)
	. $(TEST_VIRTUAL_ENV)/bin/activate \
		&& export DOCKER_IMAGE=$(DOCKER_IMAGE) \
		&& export USE_MOUNTED_DATA=1 \
		&& ./bin/flask_start.sh \
		&& ./bin/wait_for_server_then_run_tests.sh \
		&& ./bin/flask_stop.sh
