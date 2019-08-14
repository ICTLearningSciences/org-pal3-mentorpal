DOCKER_IMAGE?=dev-video-service
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)

docker-build:
	docker build \
		-t $(DOCKER_IMAGE) \
	.

docker-run:
	docker run \
			--rm \
			-it \
			-v $(PROJECT_ROOT)/mentors/videos:/data/videos/mentors \
			-p 8081:80 \
		$(DOCKER_IMAGE)

shell:
	docker run \
			--rm \
			-it \
			--entrypoint /bin/bash \
			-v $(PROJECT_ROOT)/mentors/videos:/data/videos/mentors \
			-p 8081:80 \
		$(DOCKER_IMAGE)
