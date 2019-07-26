DOCKER_IMAGE?=mentor-processing-pipeline
DOCKER_IMAGE_ID=$(shell docker images -q $(DOCKER_IMAGE))
DOCKER_CONTAINER=mentor-processing-pipeline
MENTOR?=julianne
SESSION?=1
URL?=http://mentorpal-source-videos.s3-website-us-east-1.amazonaws.com/julianne
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
	$(MAKE) build
endif


$(WATSON_CREDENTIALS):
	@echo "SET_USERNAME_HERE" > $(WATSON_CREDENTIALS)
	@echo "SET_PASSWORD_HERE" >> $(WATSON_CREDENTIALS)
	chmod 600 $(WATSON_CREDENTIALS)

# Removes all mentor files from the local file system
.PHONY clean:
clean:
	rm -rf data/recordings/*

# Builds the data processing pipeline dockerfile
.PHONY build:
build:
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
			-v $(shell pwd)/data:/app/data \
			-v $(shell pwd)/src:/app/src \
		$(DOCKER_IMAGE)

# Fully pre-processes mentor data inside docker container
# Generates audiochunks and transcripts for all sessions
.PHONY build-mentor:
build-mentor: docker-image-exists $(WATSON_CREDENTIALS)
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			-v $(shell pwd)/data:/app/data \
			$(DOCKER_IMAGE) -m $(MENTOR) -t -u $(URL) -q

# Partially pre-processes mentor data inside docker container
# Generates only audiochunks for all sessions
.PHONY build-audiochunks:
build-audiochunks: docker-image-exists $(WATSON_CREDENTIALS)
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			-v $(shell pwd)/data:/app/data \
			$(DOCKER_IMAGE) -m $(MENTOR) -u $(URL)

# Partially pre-processes mentor data inside docker container
# Generates audiochunks and transcripts for one session
.PHONY pre-process-session:
pre-process-session: docker-image-exists $(WATSON_CREDENTIALS)
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			$(DOCKER_IMAGE) -m $(MENTOR) -s $(SESSION) -t -u $(URL)

# Partially pre-processes mentor data inside docker container
# Generates only audiochunks for one session
.PHONY build-session-audiochunks:
build-session-audiochunks: docker-image-exists $(WATSON_CREDENTIALS)
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			-v $(shell pwd)/data:/app/data \
			$(DOCKER_IMAGE) -m $(MENTOR) -s $(SESSION) -u $(URL)

# Adapts transcript files to questions_paraphrases_answers and prompts_utterances files
.PHONY build-qpa-pu-data:
build-qpa-pu-data: docker-image-exists $(WATSON_CREDENTIALS)
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			-v $(shell pwd)/data:/app/data \
			$(DOCKER_IMAGE) -m $(MENTOR) -q