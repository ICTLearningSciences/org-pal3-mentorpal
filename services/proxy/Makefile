DOCKER_ACCOUNT?=uscictdocker
DOCKER_REPO?=mentorpal-proxy
DOCKER_TAG?=latest
DOCKER_IMAGE?=${DOCKER_ACCOUNT}/${DOCKER_REPO}:${DOCKER_TAG}

docker-build:
	docker build \
		-t ${DOCKER_IMAGE} \
	.
