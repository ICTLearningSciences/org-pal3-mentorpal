DOCKER_IMAGE?=mentor-processing-pipeline
DOCKER_IMAGE_ID=$(shell docker images -q $(DOCKER_IMAGE))
DOCKER_CONTAINER=mentor-processing-pipeline
MENTOR?=julianne
SESSION?=1
MENTOR_SOURCE_VIDEOS?=http://mentorpal-source-videos.s3-website-us-east-1.amazonaws.com
WATSON_CREDENTIALS=secrets/watson_credentials.txt
WATSON_USERNAME?=$(shell if [ -f $(WATSON_CREDENTIALS) ]; then head -n 1 $(WATSON_CREDENTIALS); else echo ""; fi)
WATSON_PASSWORD?=$(shell if [ -f $(WATSON_CREDENTIALS) ]; then tail -n 1 $(WATSON_CREDENTIALS); else echo ""; fi)


echo-image-id:
	@echo $(DOCKER_IMAGE_ID)

echo-watson:
	@echo "u=$(WATSON_USERNAME), p=$(WATSON_PASSWORD)"


.PHONY: docker-image-exists
docker-image-exists:
ifeq ("$(DOCKER_IMAGE_ID)", "")
	$(MAKE) docker-build
endif


$(WATSON_CREDENTIALS):
	@echo "SET_USERNAME_HERE" > $(WATSON_CREDENTIALS)
	@echo "SET_PASSWORD_HERE" >> $(WATSON_CREDENTIALS)
	chmod 600 $(WATSON_CREDENTIALS)

# Removes single mentor's files from the local file system
.PHONY: clean/%
clean/%:
	@rm -rf "$*/build"


# Removes all mentor files from the local file system
.PHONY clean:
clean:
	@for m in */; do $(MAKE) clean/$${m}; done


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
			-v $(shell pwd)/$(MENTOR):/app/mounts/$(MENTOR) \
			-v $(shell pwd)/data:/app/mounts/data \
			-v $(shell pwd)/src:/app/src \
		$(DOCKER_IMAGE)


# Pre-processes mentor data inside docker container
# Generates audiochunks and transcripts for one mentor
%/build: $(WATSON_CREDENTIALS)
	@echo "creating $*/build ..."
	$(MAKE) docker-image-exists
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			-v $(shell pwd)/$*:/app/mounts/$* \
			-v $(shell pwd)/data:/app/mounts/data \
			$(DOCKER_IMAGE) -m $* -t -u $(MENTOR_SOURCE_VIDEOS)


# Adapts transcript files to questions_paraphrases_answers and prompts_utterances files
%/data:
	$(MAKE) $*/data/update

.PHONY: %/data/update
%/data/update: %/build docker-image-exists
	$(MAKE)
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(shell pwd)/$*:/app/mounts/$* \
			-v $(shell pwd)/data:/app/mounts/data \
			$(DOCKER_IMAGE) -m $* -q -c
