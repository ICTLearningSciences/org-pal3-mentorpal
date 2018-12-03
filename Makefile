#
# Phony targets.
#
.PHONY: help

APP_ROOT=$(shell pwd)

run-local:
	docker run \
	  -it \
	  --rm \
	  -u 0 \
	  -p:8000:8000 \
	  --name node-web-app \
	  -e NODE_ENV=dev \
		--mount type=bind,source=$(APP_ROOT),target=/docker_host \
	  mentorpal bash
