DOCKER_ACCOUNT?=uscictdocker
DOCKER_REPO?=mentorpal-classifier-api
DOCKER_TAG?=latest
DOCKER_IMAGE=${DOCKER_ACCOUNT}/${DOCKER_REPO}:${DOCKER_TAG}

DOCKER_CONTAINER=mentorpal-classifier-service

MENTORPAL_CLASSIFIER_IMAGE=mentorpal-classifier

CLASSIFIER_SERVICE_ROOT=$(shell pwd)
MENTORPAL_ROOT=$(shell dirname ${CLASSIFIER_SERVICE_ROOT})

docker-build:
	docker build \
		-t ${DOCKER_IMAGE} \
		--build-arg MENTORPAL_CLASSIFIER_IMAGE=${MENTORPAL_CLASSIFIER_IMAGE} \
	.


docker-run:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			--shm-size 8G \
			-p 5000:5000 \
			-v ${MENTORPAL_ROOT}:/workingcopy \
		${DOCKER_IMAGE} 

docker-run-dev:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			--shm-size 8G \
			-p 5000:5000 \
			-v ${CLASSIFIER_SERVICE_ROOT}/src/mentorpal_classifier:/app/mentorpal_classifier \
			-v ${CLASSIFIER_SERVICE_ROOT}/src/mentorpal_classifier_api:/app/mentorpal_classifier_api \
			-v ${CLASSIFIER_SERVICE_ROOT}/features:/test/features/mentorpal_classifier \
		${DOCKER_IMAGE} 

docker-run-dev-shell:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			--shm-size 8G \
			-p 5000:5000 \
			-v ${CLASSIFIER_SERVICE_ROOT}/src/mentorpal_classifier:/app/mentorpal_classifier \
			-v ${CLASSIFIER_SERVICE_ROOT}/src/mentorpal_classifier_api:/app/mentorpal_classifier_api \
			-v ${CLASSIFIER_SERVICE_ROOT}/features:/test/features/mentorpal_classifier \
			--entrypoint /bin/bash \
		${DOCKER_IMAGE} 

exec-shell:
	docker exec \
			-it \
		${DOCKER_CONTAINER} \
			bash


TEST_ENV=mentorpal_classifier_service_testing
tests-env-create:
	cd tests && \
		./conda_env_create.sh ${TEST_ENV}


tests-run:
	source activate ${TEST_ENV} && \
		cd tests && \
		bolt test-features