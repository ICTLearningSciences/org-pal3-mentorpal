CHECKPOINT_ROOT=$(shell pwd)
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
VECTOR_MODEL_BASE_URL=http://mentorpal-vector-models.s3-website-us-east-1.amazonaws.com
CHECKPOINT?=2019-06-13-1900
ARCH?=lstm_v1
MENTOR?=clint
VALIDATION_MENTOR?=""
CHECKPOINT_PATH=${CHECKPOINT_ROOT}/classifiers/${ARCH}/${CHECKPOINT}
DOCKER_IMAGE?=mentorpal-classifier

.PHONY: clean
clean:
	rm -r vector_models/*.bin

.PHONY: init
init: checkpoint-vector-models

# downloads all vector models required by active CHECKPOINT/ARCH
.PHONY: checkpoint-vector-models
checkpoint-vector-models:
	${CHECKPOINT_ROOT}/bin/checkpoint_vector_models_download.sh \
            -o ${CHECKPOINT_ROOT}/vector_models \
            -h ${VECTOR_MODEL_BASE_URL} \
        ${CHECKPOINT_PATH}
        

# CHECKPOINT={CHECKPOINT} MENTOR={MENTOR} make test-checkpoint
.PHONY: checkpoint-test
checkpoint-test: checkpoint-vector-models
	./bin/checkpoint_test.sh $(MENTOR) $(ARCH) $(CHECKPOINT) 

# make c1={CHECKPOINT1} c2={CHECKPOINT2} m={MENTOR} compare-checkpoints
.PHONY: checkpoint-compare
checkpoints-compare: checkpoint-vector-models
	./bin/checkpoints_compare.sh $(mentor) $(arch_1) $(checkpoint_1) $(arch_2) $(checkpoint_2) 

.PHONY: checkpoint-train
checkpoint-train: checkpoint-vector-models
	./bin/checkpoint_train.sh ${ARCH} ${checkpoint} ${VALIDATION_MENTOR}

.PHONY: docker-run-dev
docker-run-dev:
	docker run \
            -it \
            --rm \
            --name mentorpal-classifier \
            -v ${CHECKPOINT_ROOT}:/app/checkpoint \
            -v ${PROJECT_ROOT}/mentors:/app/mentors \
            -v ${PROJECT_ROOT}/classifier/src/mentorpal:/app/mentorpal \
            -e ARCH=${ARCH} \
            -e CHECKPOINT=${CHECKPOINT} \
            -e MENTOR=${MENTOR} \
            --workdir /app \
            --entrypoint /bin/bash \
        ${DOCKER_IMAGE}
	