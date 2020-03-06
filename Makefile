SHELL:=/bin/bash
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
VENV=.venv

EBS_BUNDLE_MENTOR_API=build/ebs/bundle/mentor-api
$(EBS_BUNDLE_MENTOR_API):
	mkdir -p $(EBS_BUNDLE_MENTOR_API)
	cp -R checkpoint/classifiers $(EBS_BUNDLE_MENTOR_API)/classifiers
	cp -R mentors/data/mentors $(EBS_BUNDLE_MENTOR_API)/mentors

$(VENV):
	$(MAKE) venv-create

.PHONY: venv-create
venv-create:
	[ -d $(VENV) ] || virtualenv -p python3 $(VENV)
	$(VENV)/bin/pip install --upgrade pip
	$(VENV)/bin/pip install -r requirements.txt

###############################################################################
# Run the app locally with 'docker-compose up'
# with a clean build of docker-compose.yml
# (updated secrets and config)
# Once the server is running, you can open the local site in a browser at
# http://localhost:8080
###############################################################################
.PHONY: local-run
local-run: $(VENV)
	$(VENV)/bin/docker-compose up

.PHONY: local-run-dev
local-run-dev: $(VENV)
	$(VENV)/bin/docker-compose -f docker-compose.yml -f  docker-compose.dev-override.yml up

.PHONY: local-stop
local-stop: $(VENV)
	$(VENV)/bin/docker-compose down

virtualenv-installed:
	$(PROJECT_ROOT)/bin/virtualenv_ensure_installed.sh

eb-ssh-%: $(VENV)
	. $(VENV)/bin/activate \
		&& eb use $* --region us-east-1 \
		&& eb ssh