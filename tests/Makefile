PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)

virtualenv-installed:
	$(PROJECT_ROOT)/bin/virtualenv_ensure_installed.sh

BEHAVE_RESTFUL=$(PROJECT_ROOT)/behave-restful
$(BEHAVE_RESTFUL)/setup.py:
	@echo "initializing submodule behave-restful..."
	cd $(PROJECT_ROOT) && \
        git submodule init && \
        git submodule update --remote 


VENV=.venv
VENV_PIP=$(VENV)/bin/pip
$(VENV):
	$(MAKE) test-env-create

.PHONY: test-env-create
test-env-create: $(PROJECT_ROOT)/behave-restful/setup.py virtualenv-installed
	[ -d $(VENV) ] || virtualenv -p python3 $(VENV)
	$(VENV_PIP) install --upgrade pip
	$(VENV_PIP) install -r requirements.txt
	$(VENV_PIP) install -r $(BEHAVE_RESTFUL)/requirements.txt && \
	$(VENV_PIP) install -e $(BEHAVE_RESTFUL)

.PHONY: test
test: $(VENV)
	. $(VENV)/bin/activate \
		&& export DOCKER_IMAGE=$(DOCKER_IMAGE) \
		&& export USE_MOUNTED_DATA=1 \
		&& ./bin/flask_start.sh \
		&& ./bin/wait_for_server_then_run_tests.sh \
		&& ./bin/flask_stop.sh
