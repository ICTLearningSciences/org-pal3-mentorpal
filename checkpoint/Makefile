CHECKPOINT_ROOT=$(shell pwd)
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
CHECKPOINT?=2019-11-09-0031
MENTOR_ROOT=$(PROJECT_ROOT)/mentors/data/mentors
ARCH?=lstm_v1
MENTOR?=clint
CHECKPOINT_PATH=${CHECKPOINT_ROOT}/classifiers/${ARCH}/${CHECKPOINT}
MENTOR_CLASSIFIER_TAG=1.0.0
MENTOR_CLASSIFIER_DOCKER?=uscictdocker/mentor-classifier:$(MENTOR_CLASSIFIER_TAG)
MENTOR_CLASSIFIER_PIP="git://github.com/ICTLearningSciences/mentor-classifier.git@$(MENTOR_CLASSIFIER_TAG)\#egg=mentor_classifier"
VENV=.venv

$(VENV):
	$(MAKE) venv-create

.PHONY: venv-create
venv-create:
	[ -d $(VENV) ] || virtualenv -p python3 $(VENV)
	$(VENV)/bin/pip install --upgrade pip
	$(VENV)/bin/pip install -e $(MENTOR_CLASSIFIER_PIP)


.PHONY: checkpoint-clean/mentor/%
checkpoint-clean/mentor/%: vector_models
	rm -rf classifiers/$(ARCH)/*$**

# make c1={CHECKPOINT1} c2={CHECKPOINT2} m={MENTOR} compare-checkpoints
.PHONY: checkpoint-compare
checkpoints-compare: $(VENV) vector_models
	./bin/checkpoints_compare.sh $(mentor) $(arch_1) $(checkpoint_1) $(arch_2) $(checkpoint_2) 

.PHONY: checkpoint-test
checkpoint-test: $(VENV) vector_models
	. $(VENV)/bin/activate \
        && mentor_classifier_docker checkpoint-test \
                --arch $(ARCH) \
                --checkpoint $(CHECKPOINT) \
                --image $(MENTOR_CLASSIFIER_DOCKER) \
                --mentor $(MENTOR) \
                --mentor-root $(MENTOR_ROOT) \
                --checkpoint-root $(CHECKPOINT_ROOT) \
                --docker-env "TEST_SET=testing_data_full.csv"

.PHONY: checkpoint-train
checkpoint-train: $(VENV) vector_models
	. $(VENV)/bin/activate \
        && mentor_classifier_docker checkpoint-train \
                --arch $(ARCH) \
                --checkpoint $(CHECKPOINT) \
                --image $(MENTOR_CLASSIFIER_DOCKER) \
                --mentor-root $(MENTOR_ROOT) \
                --checkpoint-root $(CHECKPOINT_ROOT)


.PHONY: checkpoint-train/mentor/%
checkpoint-train/mentor/%: $(VENV) vector_models
	. $(VENV)/bin/activate \
        && mentor_classifier_docker checkpoint-train \
                --arch $(ARCH) \
                --checkpoint $(CHECKPOINT) \
                --image $(MENTOR_CLASSIFIER_DOCKER) \
                --mentor-root $(MENTOR_ROOT) \
                --checkpoint-root $(CHECKPOINT_ROOT) \
                --mentor $*

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
        ${MENTOR_CLASSIFIER_DOCKER}
	
.PHONY: vector_models
vector_models:
	git lfs install && git lfs pull