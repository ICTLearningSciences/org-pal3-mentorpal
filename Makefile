SHELL:=/bin/bash
EBS_BUNDLE_MENTOR_API=build/ebs/bundle/mentor-api
ENV?=dev-mentorpal
VENV=.venv

$(EBS_BUNDLE_MENTOR_API):
	mkdir -p $(EBS_BUNDLE_MENTOR_API)
	cp -R checkpoint/classifiers $(EBS_BUNDLE_MENTOR_API)/classifiers
	cp -R mentors/data/mentors $(EBS_BUNDLE_MENTOR_API)/mentors

$(VENV):
	$(MAKE) $(VENV)-update

.PHONY: $(VENV)-update
$(VENV)-update:
	[ -d $(VENV) ] || virtualenv -p python3 $(VENV)
	$(VENV)/bin/pip install --upgrade pip
	$(VENV)/bin/pip install -r requirements.txt

.PHONY: run
run: $(VENV)
	docker-compose up $(args)

.PHONY: run-local-lrs-%
run-local-lrs-%: $(VENV)
ifeq ("$(LRS_PASSWORD)","")
	@echo "required env variable LRS_PASSWORD unset"
	@exit 1
endif
	export ENV=$* \
	&& export LRS_PASSWORD=$(LRS_PASSWORD) \
	&& docker-compose -f docker-compose.yml -f docker-compose.local-lrs.yml up

.PHONY: run-local-lrs
run-local-lrs:
	$(MAKE) run-local-lrs-dev-mentorpal

.PHONY: run-local-video
run-local-video: $(VENV)
	docker-compose -f docker-compose.yml -f docker-compose.local-videos.yml up

.PHONY: local-stop
stop: $(VENV)
	docker-compose down

virtualenv-installed:
	sh ./bin/virtualenv_ensure_installed.sh

eb-ssh-%: $(VENV)
	. $(VENV)/bin/activate \
		&& eb use $* --region us-east-1 \
		&& eb ssh

.PHONY: test
test:
	cd tests && $(MAKE) test

LICENSE:
	@echo "you must have a LICENSE file" 1>&2
	exit 1

LICENSE_HEADER:
	@echo "you must have a LICENSE_HEADER file" 1>&2
	exit 1

.PHONY: license
license: LICENSE LICENSE_HEADER node_modules/license-check-and-add
	npm run license:fix

.PHONY: test-license
test-license: LICENSE LICENSE_HEADER node_modules/license-check-and-add
	npm run test:license

node_modules/license-check-and-add:
	npm ci
