DOCKER_IMAGE?=mentor-processing-pipeline
DOCKER_CONTAINER=mentor-processing-pipeline
MENTOR?=julianne
SESSION?=1
URL?=http://mentorpal-source-video.s3-website-us-west-1.amazonaws.com/julianne
WATSON_USERNAME=`head -n 1 secrets/watson_credentials.txt`
WATSON_PASSWORD=`tail -n 1 secrets/watson_credentials.txt`

# Removes all mentor files from the local file system
.PHONY clean:
clean:
	rm -rf recordings/*

# Builds the data processing pipeline dockerfile
.PHONY build:
build:
	docker build -t $(DOCKER_IMAGE) .

# Runs a shell inside the data processing pipeline dockerfile
.PHONY shell:
shell:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			--entrypoint /bin/bash \
			-v $(shell pwd)/recordings:/app/recordings \
			$(DOCKER_IMAGE)

# Fully pre-processes mentor data inside docker container
# Generates audiochunks and transcripts for all sessions
.PHONY build-mentor:
build-mentor:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			-v $(shell pwd)/recordings:/app/recordings \
			$(DOCKER_IMAGE) -m $(MENTOR) -t -u $(URL)

# Partially pre-processes mentor data inside docker container
# Generates only audiochunks for all sessions
.PHONY build-audiochunks:
build-audiochunks:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			-v $(shell pwd)/recordings:/app/recordings \
			$(DOCKER_IMAGE) -m $(MENTOR) -u $(URL)

# Partially pre-processes mentor data inside docker container
# Generates audiochunks and transcripts for one session
.PHONY build-session:
build-session:
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
build-session-audiochunks:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			-v $(shell pwd)/recordings:/app/recordings \
			$(DOCKER_IMAGE) -m $(MENTOR) -s $(SESSION) -u $(URL)
