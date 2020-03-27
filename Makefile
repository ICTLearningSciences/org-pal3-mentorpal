SHELL:=/bin/bash
VENV=.venv
EBS_BUNDLE_MENTOR_API=build/ebs/bundle/mentor-api
ENV?=dev-mentorpal

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

.PHONY: run
run: $(VENV)
	$(VENV)/bin/docker-compose up

.PHONY: run-local-lrs-%
run-local-lrs-%: $(VENV)
ifeq ("$(LRS_PASSWORD)","")
	@echo "required env variable LRS_PASSWORD unset"
	@exit 1
endif
	export ENV=$* \
	&& export LRS_PASSWORD=$(LRS_PASSWORD) \
	&& $(VENV)/bin/docker-compose -f docker-compose.yml -f docker-compose.local-lrs.yml up

.PHONY: run-local-lrs
run-local-lrs:
	$(MAKE) run-local-lrs-dev-mentorpal

.PHONY: run-local-video
run-local-video: $(VENV)
	$(VENV)/bin/docker-compose -f docker-compose.yml -f  docker-compose.local-videos.yml up

.PHONY: local-stop
stop: $(VENV)
	$(VENV)/bin/docker-compose down

virtualenv-installed:
	sh ./bin/virtualenv_ensure_installed.sh

eb-ssh-%: $(VENV)
	. $(VENV)/bin/activate \
		&& eb use $* --region us-east-1 \
		&& eb ssh

DOTENVENC=node_modules/.bin/dotenvenc
$(DOTENVENC):
	NODE_ENV=build npm ci

env/lrs/%/.password:
ifneq ("$(password)","")
	@echo "updating password file at env/lrs/$*/.password..."
	@echo $(password) > env/lrs/$*/.password
	chmod 600 env/lrs/$*/.password
endif

env/lrs/%/.env:
	@echo "requires (unversioned) source .env file at env/lrs/$*/.env"
	exit 1

env/lrs/%/.env.enc: env/lrs/%/.env $(DOTENVENC)
ifneq ("$(password)","")
	rm -f env/lrs/$*/.password
	$(MAKE) env/lrs/$*/.password password=$(password)
endif
	@if [ ! -f env/lrs/$*/.password ]; then \
		echo "Password required in $(env/lrs/$*/.password)"; \
		echo "...or pass it to this rule as follows:"; \
		echo "    make env/lrs/$*/.env.enc password=<your_password>"; \
		exit 1; \
	fi
	cd env/lrs/$* && \
		npx dotenvenc "$$(cat .password)"

.PHONY: env/lrs/%/rebuild
env/lrs/%/rebuild: env/%/.env
	rm -f env/lrs/$*/.env.enc
	$(MAKE) env/lrs/$*/.env.enc
