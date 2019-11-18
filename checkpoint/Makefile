CHECKPOINT_ROOT=$(shell pwd)
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
CHECKPOINT?=2019-11-09-0031
ARCH?=lstm_v1
MENTOR?=clint
CHECKPOINT_PATH=${CHECKPOINT_ROOT}/classifiers/${ARCH}/${CHECKPOINT}
DOCKER_IMAGE?=uscictdocker/mentor-classifier:1.0.0-alpha.12

.PHONY: checkpoint-clean/mentor/%
checkpoint-clean/mentor/%:
	rm -rf classifiers/$(ARCH)/*$**

# make c1={CHECKPOINT1} c2={CHECKPOINT2} m={MENTOR} compare-checkpoints
.PHONY: checkpoint-compare
checkpoints-compare: 
	./bin/checkpoints_compare.sh $(mentor) $(arch_1) $(checkpoint_1) $(arch_2) $(checkpoint_2) 

# CHECKPOINT={CHECKPOINT} MENTOR={MENTOR} make test-checkpoint
.PHONY: checkpoint-test
checkpoint-test: 
	./bin/checkpoint_test.sh \
                --arch $(ARCH) \
                --checkpoint $(CHECKPOINT) \
                --image $(DOCKER_IMAGE) \
                --mentor $(MENTOR)

.PHONY: checkpoint-train
checkpoint-train: 
	./bin/checkpoint_train.sh \
                --arch $(ARCH) \
                --checkpoint $(CHECKPOINT) \
                --image $(DOCKER_IMAGE)

.PHONY: checkpoint-train/mentor/%
checkpoint-train/mentor/%: 
	./bin/checkpoint_train.sh $(ARCH) ${CHECKPOINT} $*

.PHONY: docker-run-dev
docker-run-dev:
	docker run \
            -it \
            --rm \
            --name mentor-classifier \
            -v ${CHECKPOINT_ROOT}:/app/checkpoint \
            -v ${PROJECT_ROOT}/mentors:/app/mentors \
            -v ${PROJECT_ROOT}/classifier/src/mentorpal:/app/mentorpal \
            -e ARCH=${ARCH} \
            -e CHECKPOINT=${CHECKPOINT} \
            -e MENTOR=${MENTOR} \
            --workdir /app \
            --entrypoint /bin/bash \
        ${DOCKER_IMAGE}
	