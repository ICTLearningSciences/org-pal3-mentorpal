DOCKER_IMAGE?=mentor-processing-pipeline
DOCKER_CONTAINER=mentor-processing-pipeline
MENTOR?=julianne
PIPELINE_PATH=src/data_pipeline/pipeline_entrypoint.py
SESSION?=1

# Removes all mentor files from the local file system
.PHONY clean:
clean:
	rm -rf recordings/*

# Builds the data processing pipeline dockerfile
docker-build:
	docker build -t $(DOCKER_IMAGE) .

# Runs a shell inside the data processing pipeline dockerfile
docker-run:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(shell pwd)/recordings:/app/recordings \
			$(DOCKER_IMAGE) \
			/bin/bash

# Fully pre-processes mentor data inside docker container
# Generates audiochunks and transcripts for all sessions
docker-build-mentor:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(shell pwd)/recordings:/app/recordings \
			--entrypoint python3 $(DOCKER_IMAGE) $(PIPELINE_PATH) -m $(MENTOR) -t

# Partially pre-processes mentor data inside docker container
# Generates only audiochunks for all sessions
docker-build-audiochunks:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(shell pwd)/recordings:/app/recordings \
			--entrypoint python3 $(DOCKER_IMAGE) $(PIPELINE_PATH) -m $(MENTOR)

# Partially pre-processes mentor data inside docker container
# Generates audiochunks and transcripts for one session
docker-build-session:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(shell pwd)/recordings:/app/recordings \
			--entrypoint python3 $(DOCKER_IMAGE) $(PIPELINE_PATH) -m $(MENTOR) -s $(SESSION)

# Partially pre-processes mentor data inside docker container
# Generates only audiochunks for one session
docker-build-session-audiochunks:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(shell pwd)/recordings:/app/recordings \
			--entrypoint python3 $(DOCKER_IMAGE) $(PIPELINE_PATH) -m $(MENTOR) -s $(SESSION)