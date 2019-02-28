DOCKER_ACCOUNT?=uscictdocker
DOCKER_REPO?=mentorpal-web-app
DOCKER_TAG?=latest
DOCKER_IMAGE=${DOCKER_ACCOUNT}/${DOCKER_REPO}:${DOCKER_TAG}
DOCKER_PASSWORD_FILE := "$(HOME)/.docker/$(DOCKER_ACCOUNT).password"

DOCKER_CONTAINER=mentorpal-web-app

SERVICE_ROOT=$(shell pwd)
# MENTORPAL_ROOT=$(shell dirname ${SERVICE_ROOT})

docker-build:
	docker build \
		-t ${DOCKER_IMAGE} \
	.

# docker-login
#
# Tries to ensure user is logged in to docker image repo (dockerhub by default)
# as  user DOCKER_USER.
#
# Will trigger an interactive prompt for password *unless* user has stored
# their password in ~/.docker/$(DOCKER_USER).password
# e.g. echo mypasswordhere > ~/.docker/uscict.password && chmod 600 ~/.docker/uscict.password
docker-login:
ifneq ("$(wildcard $(DOCKER_PASSWORD_FILE))","")
	@echo "store your docker password at $(DOCKER_PASSWORD_FILE) so you won't have to enter it again"
	docker login -u $(DOCKER_ACCOUNT)
else
	cat $(DOCKER_PASSWORD_FILE) | docker login -u $(DOCKER_ACCOUNT) --password-stdin
endif

docker-push-tag: docker-login
	docker push $(DOCKER_IMAGE)

docker-run:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			-p 3000:3000 \
		${DOCKER_IMAGE} 

docker-run-dev:
	docker run \
			-it \
			--rm \
			--name ${DOCKER_CONTAINER} \
			-p 3000:3000 \
			-v ${SERVICE_ROOT}/bin:/app/bin \
			-v ${SERVICE_ROOT}/public:/app/public \
			-v ${SERVICE_ROOT}/routes:/app/routes \
			-v ${SERVICE_ROOT}/views:/app/views \
			-v ${SERVICE_ROOT}/utils:/app/utils \
			-e WATSON_USER=${WATSON_USER} \
			-e WATSON_PASSWORD=${WATSON_PASSWORD} \
		${DOCKER_IMAGE} 

# docker-run-dev-shell:
# 	docker run \
# 			-it \
# 			--rm \
# 			--name ${DOCKER_CONTAINER} \
# 			--shm-size 8G \
# 			-p 5000:5000 \
# 			-v ${SERVICE_ROOT}/src/mentorpal_classifier:/app/mentorpal_classifier \
# 			-v ${SERVICE_ROOT}/src/mentorpal_classifier_api:/app/mentorpal_classifier_api \
# 			-v ${SERVICE_ROOT}/features:/test/features/mentorpal_classifier \
# 			--entrypoint /bin/bash \
# 		${DOCKER_IMAGE} 

exec-shell:
	docker exec \
			-it \
		${DOCKER_CONTAINER} \
			bash
