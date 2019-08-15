DOCKER_IMAGE?=mentorpal-proxy
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)


docker-build:
	docker build \
		-t ${DOCKER_IMAGE} \
	.

shell:
	docker run \
			--rm \
			-it \
			-v $(PROJECT_ROOT)/mentors/videos:/www/data/videos/mentors \
			--entrypoint /bin/bash \
		$(DOCKER_IMAGE)
