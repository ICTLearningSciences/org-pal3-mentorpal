PWD=$(shell pwd)
DOCKER_IMAGE?=mentor-processing-pipeline
DOCKER_IMAGE_ID=$(shell docker images -q $(DOCKER_IMAGE))
DOCKER_CONTAINER=mentor-processing-pipeline
SESSION?=1
MENTOR_SOURCE_VIDEOS?=http://mentorpal-source-videos.s3-website-us-east-1.amazonaws.com
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
WATSON_CREDENTIALS=secrets/watson_credentials.txt
WATSON_USERNAME?=$(shell if [ -f $(WATSON_CREDENTIALS) ]; then head -n 1 $(WATSON_CREDENTIALS); else echo ""; fi)
WATSON_PASSWORD?=$(shell if [ -f $(WATSON_CREDENTIALS) ]; then tail -n 1 $(WATSON_CREDENTIALS); else echo ""; fi)

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
	PYTHONPATH=$(shell echo $${PYTHONPATH}):$(shell pwd)/src/data_pipeline $(TEST_VIRTUAL_ENV)/bin/py.test -vv

.PHONY: docker-image-exists
docker-image-exists:
ifeq ("$(DOCKER_IMAGE_ID)", "")
	$(MAKE) docker-build
endif

$(WATSON_CREDENTIALS):
	@echo "SET_USERNAME_HERE" > $(WATSON_CREDENTIALS)
	@echo "SET_PASSWORD_HERE" >> $(WATSON_CREDENTIALS)
	chmod 600 $(WATSON_CREDENTIALS)

# Removes single mentor's data files from the local file system
.PHONY: data/mentors/%/clean
data/mentors/%/clean:
	@echo "cleaning data/mentors/$*/build..."
	@rm -rf "data/mentors/$*/build"

# Removes single mentor's data files from the local file system
.PHONY: videos/%/clean
videos/%/clean:
	@echo "cleaning videos/$*..."
	@rm -rf "videos/$*"

# Removes all mentor files from the local file system
.PHONY clean:
clean:
	@for m in data/mentors/*/*; do $(MAKE) data/mentors/$${m}/clean; done
	@for m in videos/*/*; do $(MAKE) videos/$${m}/clean; done


# Builds the data processing pipeline dockerfile
.PHONY docker-build:
docker-build:
	docker build -t $(DOCKER_IMAGE) .


# Runs a shell inside the data processing pipeline dockerfile
.PHONY shell:
shell: docker-image-exists $(WATSON_CREDENTIALS)
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			--entrypoint /bin/bash \
			-v $(PWD)/data:/app/mounts/data \
			-v $(PWD)/videos:/app/mounts/videos \
			-v $(PWD)/src:/app/src \
		$(DOCKER_IMAGE)


# Pre-processes mentor data inside docker container
# Downloads missing files
# Generates audiochunks and transcripts for one mentor
.SECONDARY:
data/mentors/%/build: $(WATSON_CREDENTIALS)
	$(MAKE) data/mentors/$*/build/update

# Pre-processes mentor data inside docker container
# Downloads missing files
# Generates audiochunks and transcripts for one mentor
.PHONY: data/mentors/%/build/update
data/mentors/%/build/update: docker-image-exists $(WATSON_CREDENTIALS)
	mkdir -p data/mentors/$*/build
	@echo "updating data/mentors/$*/build ..."
	docker run \
			--rm \
			-it \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			-v $(PWD)/data:/app/mounts/data \
			-v $(PWD)/src:/app/src \
			$(DOCKER_IMAGE) --mentor $* --transcripts --url $(MENTOR_SOURCE_VIDEOS)


# Complete build of mentor data
# Runs build if necessary
# Generates data files
.SECONDARY:
data/mentors/%/data:
	$(MAKE) data/mentors/$*/data/update

# Complete build of mentor data
# Runs build if necessary
# Generates data files
.PHONY: data/mentors/%/data/update
data/mentors/%/data/update: data/mentors/%/build docker-image-exists
	mkdir -p $*/data
	cp data/topics.csv data/mentors/$*/data/topics.csv
	docker run \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(PWD)/src:/app/src \
			-v $(PWD)/data:/app/mounts/data \
			$(DOCKER_IMAGE) --mentor $* --qpa_pu_data --classification_data

# Complete build of mentor data and videos
# Runs build if necessary
# Generates data files
.SECONDARY:
videos/%:
	$(MAKE) update/videos/$*

# Complete build of mentor data and videos
# Runs build if necessary
# Generates data files
.PHONY: videos/%/update 
update/videos/%: docker-image-exists data/mentors/%/build
	mkdir -p videos/$*
	docker run \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(PWD)/src:/app/src \
			-v $(PWD)/data:/app/mounts/data \
			-v $(PWD)/videos:/app/mounts/videos \
			$(DOCKER_IMAGE) --mentor $* --qpa_pu_data --classification_data --videos --url $(MENTOR_SOURCE_VIDEOS)
	@echo ""
	@echo "==== MAKE VIDEOS SUCCEEDED! ===="
	@echo ""
	@echo "If you haven't build the classifier, you can do that with:"
	@echo "	make $*/checkpoint"
	@echo ""
	@echo "Once the classifier checkpoint is in place, you can test the environment locally with:"
	@echo "	cd .. && make local-run-dev"
	@echo ""
	@echo "Then view your mentor here:"
	@echo "	http://localhost:8080/mentorpanel/?mentor=$*"

# Build checkpoint from mentor data
.PHONY: %/checkpoint
%/checkpoint: data/mentors/%/data
	cd $(PROJECT_ROOT)/checkpoint && \
	CHECKPOINT=dev_latest $(MAKE) checkpoint-clean/mentor/$* checkpoint-train/mentor/$*
	@echo ""
	@echo "==== MAKE CHECKPOINT SUCCEEDED! ===="
	@echo ""
	@echo "If you have generated mentor videos, you can test the environment locally with:"
	@echo "	cd .. && make local-run-dev"
	@echo ""
	@echo "Then view your mentor here:"
	@echo "	http://localhost:8080/mentorpanel/?mentor=$*"

# Run latest checkpoint for mentor
# To run custom checkpoint, use rules inside /mentor-api
.PHONY: checkpoint-run
checkpoint-run:
	cd $(PROJECT_ROOT)/services/mentor-api && \
	$(MAKE) docker-run-checkpoint/dev_latest
