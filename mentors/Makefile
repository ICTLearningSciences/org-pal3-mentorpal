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
			-v $(shell pwd)/videos:/app/mounts/videos \
			-v $(shell pwd)/src:/app/src \
		$(DOCKER_IMAGE)


# Pre-processes mentor data inside docker container
# Downloads missing files
# Generates audiochunks and transcripts for one mentor
.SECONDARY:
%/build: $(WATSON_CREDENTIALS)
	$(MAKE) $*/build/update

# Pre-processes mentor data inside docker container
# Downloads missing files
# Generates audiochunks and transcripts for one mentor
.PHONY: %/build/update
%/build/update: docker-image-exists $(WATSON_CREDENTIALS)
	@echo "creating $*/build ..."
	docker run \
			--rm \
			-it \
			--name $(DOCKER_CONTAINER) \
			-e WATSON_USERNAME=$(WATSON_USERNAME) \
			-e WATSON_PASSWORD=$(WATSON_PASSWORD) \
			-v $(shell pwd)/$*:/app/mounts/$* \
			-v $(shell pwd)/data:/app/mounts/data \
			$(DOCKER_IMAGE) --mentor $* --transcripts --url $(MENTOR_SOURCE_VIDEOS)


# Complete build of mentor data
# Runs build if necessary
# Generates data files
%/data:
	$(MAKE) $*/data/update

# Complete build of mentor data
# Runs build if necessary
# Generates data files
.PHONY: %/data/update
%/data/update: %/build docker-image-exists
	mkdir -p $*/data
	cp data/topics.csv $*/data/topics.csv
	docker run \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(shell pwd)/$*:/app/mounts/$* \
			-v $(shell pwd)/data:/app/mounts/data \
			$(DOCKER_IMAGE) --mentor $* --qpa_pu_data --classification_data

# Complete build of mentor data and videos
# Runs build if necessary
# Generates data files
%/videos:
	$(MAKE) $*/videos/update

# Complete build of mentor data and videos
# Runs build if necessary
# Generates data files
.PHONY: %/videos/update
%/videos/update: %/build docker-image-exists
	mkdir -p $(shell pwd)/$*/data
	cp $(shell pwd)/data/topics.csv $(shell pwd)/$*/data/topics.csv
	docker run \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(shell pwd)/$*:/app/mounts/$* \
			-v $(shell pwd)/data:/app/mounts/data \
			-v $(shell pwd)/videos:/app/mounts/videos \
			$(DOCKER_IMAGE) --mentor $* --qpa_pu_data --classification_data --videos
