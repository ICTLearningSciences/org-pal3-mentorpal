#!/usr/bin/env bash
SERVICE_NAME=${1}
DOCKER_SERVICES=/ebs-tools/bin/docker_services.sh
if [ -f ${DOCKER_SERVICES} ]; then
	${DOCKER_SERVICES} print-service-tag ${SERVICE_NAME}
    exit 0
fi

docker run \
		--rm \
		--entrypoint=/ebs-tools/bin/docker_services.sh \
		-e BUILD_TAG=${BUILD_TAG} \
		-e PROJECT_ROOT=${PROJECT_ROOT} \
		-e PROJECT_NAME=${PROJECT_NAME} \
		-e DOCKER_ACCOUNT=${DOCKER_ACCOUNT} \
	larrykirschner/circleci-elasticbeanstalk \
		print-service-tag mentor-api