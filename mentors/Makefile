## TODO: fix video cropping for wrong-sized videos
PWD=$(shell pwd)
AWS_ACCESS_KEY_ID?=required_if_using_aws_transcribe
AWS_SECRET_ACCESS_KEY?=required_if_using_aws_transcribe
DOCKER_IMAGE?=uscictdocker/mentor-pipeline:1.5.0
DOCKER_CONTAINER=mentor-pipeline
PROJECT_ROOT?=$(shell git rev-parse --show-toplevel 2> /dev/null)
AWS_REGION?=us-east-1
TRANSCRIBE_AWS_S3_BUCKET_SOURCE?=mentorpal-transcribe-source
TRANSCRIBE_MODULE_PATH?=transcribe_aws
DEV_ENABLED?=
DEV_ROOT?=$(shell cd ~/projects && pwd 2> /dev/null)
DEV_MENTOR_PIPELINE?=$(shell cd $(DEV_ROOT)/mentor-pipeline && pwd 2> /dev/null)
DEV_TRANSCRIBE?=$(shell cd $(DEV_ROOT)/py-transcribe && pwd 2> /dev/null)
DEV_TRANSCRIBE_AWS?=$(shell cd $(DEV_ROOT)/py-transcribe-aws && pwd 2> /dev/null)
DOCKER_PYTHON_VERSION=3.8
DOCKER_SITE_PACKAGES=/usr/local/lib/python$(DOCKER_PYTHON_VERSION)/site-packages
DOCKER_ENV_ARGS=\
	-e AWS_REGION=$(AWS_REGION) \
	-e AWS_ACCESS_KEY_ID=$(AWS_ACCESS_KEY_ID) \
	-e AWS_SECRET_ACCESS_KEY=$(AWS_SECRET_ACCESS_KEY) \
	-e TRANSCRIBE_AWS_S3_BUCKET_SOURCE=$(TRANSCRIBE_AWS_S3_BUCKET_SOURCE) \
	-e TRANSCRIBE_MODULE_PATH=$(TRANSCRIBE_MODULE_PATH)
DOCKER_VOLUME_ARGS_DATA_AND_VIDEO=\
	-v $(PWD)/data:/app/mounts/data \
	-v $(PWD)/videos:/app/mounts/videos
DOCKER_VOLUME_ARGS_DEV=
ifeq ("$(DEV_ENABLED)", "1")
ifneq ("$(DEV_TRANSCRIBE)", "")
	DOCKER_VOLUME_ARGS_DEV += -v $(DEV_TRANSCRIBE)/transcribe:$(DOCKER_SITE_PACKAGES)/transcribe
endif
ifneq ("$(DEV_TRANSCRIBE_AWS)", "")
	DOCKER_VOLUME_ARGS_DEV += -v $(DEV_TRANSCRIBE_AWS)/transcribe_aws:$(DOCKER_SITE_PACKAGES)/transcribe_aws
endif
ifneq ("$(DEV_MENTOR_PIPELINE)", "")
	DOCKER_VOLUME_ARGS_DEV += -v $(DEV_MENTOR_PIPELINE)/mentor_pipeline:/app/mentor_pipeline
endif
endif
DOCKER_ARGS=\
	$(DOCKER_ENV_ARGS) \
	$(DOCKER_VOLUME_ARGS_DATA_AND_VIDEO) \
	$(DOCKER_VOLUME_ARGS_DEV)
# virtualenv used for pytest
VENV=.venv
$(VENV):
	$(MAKE) $(VENV)-update

abs=$(shell d=$$(cd $$(dirname $(1)); pwd); f=$$(basename '$(1)') && echo "$${d}/$${f}")
absdir=$(shell cd $$(dirname $(1)); pwd)
fname=$(shell echo $$(basename '$(1)'))

.PHONY: $(MAKE) $(VENV)-update
$(VENV)-update: virtualenv-installed
	[ -d $(VENV) ] || virtualenv -p python3 $(VENV)
	$(VENV)/bin/pip install --upgrade pip
	$(VENV)/bin/pip install -r ./requirements.txt

virtualenv-installed:
	$(PROJECT_ROOT)/bin/virtualenv_ensure_installed.sh

# Removes single mentor's data files from the local file system
.PHONY: data/mentors/%/clean
data/mentors/%/clean:
	@echo "cleaning data/mentors/$*/build..."
	@rm -rf "data/mentors/$*/build"

VIDEOS_LOCAL?=./videos
VIDEOS_DEV?=s3://dev-video.mentorpal.org/videos
VIDEO_SYNC_SRC?=$(VIDEOS_LOCAL)
VIDEO_SYNC_DST?=$(VIDEOS_DEV)

.PHONY: video-sync
video-sync: $(VENV)
	$(MAKE) video-sync/mentors

.PHONY: video-sync/%
video-sync/%:
	$(VENV)/bin/aws s3 sync $(VIDEO_SYNC_SRC)/$* $(VIDEO_SYNC_DST)/$* --exclude 'build/*'

.PHONY: video-sync-up
video-sync-up:
	$(MAKE) video-sync-up/mentors

.PHONY: video-sync-up-%
video-sync-up/%: $(VENV)
	VIDEO_SYNC_SRC=$(VIDEO_SYNC_SRC) VIDEO_SYNC_DST=$(VIDEO_SYNC_DST) $(MAKE) video-sync/$*


# Removes single mentor's data files from the local file system
.PHONY: videos/%/clean
videos/%/clean:
	@echo "cleaning videos/$*..."
	@rm -rf "videos/$*"

# Removes all mentor files from the local file system
.PHONY clean:
clean:
	@for m in data/mentors/*/*; do $(MAKE) data/mentors/$${m}/clean; done
	@for m in videos/*/*; do $(MAKE) videos/$${m}/clean; done


# Runs a shell inside the data processing pipeline dockerfile
.PHONY shell:
shell:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			--entrypoint /bin/bash \
			$(DOCKER_ARGS) \
		$(DOCKER_IMAGE)


# Complete build of mentor data
# Runs build if necessary
# Generates data files
# TODO: 1) log every significant action (generating audio, transcribing), 2) build classifier for jd, 3) utterance yaml gets error codes, 4) make delete audio files that failed to transcribe
.PHONY: data/mentor-%
data/mentor-%:
	docker run \
			--rm \
			--name $(DOCKER_CONTAINER) \
			$(DOCKER_ARGS) \
			$(DOCKER_IMAGE) data-update --mentor $* --data=/app/mounts/data/mentors $(args)

.PHONY: data/topics_by_question.csv/mentor-%
data/topics_by_question.csv/mentors-%:
	docker run \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(PWD)/data:/app/mounts/data \
			$(DOCKER_IMAGE) topics-by-question-generate --mentor $* --data=/app/mounts/data/mentors


.PHONY: videos/mentor-%
videos/mentor-%: data/mentor-% 
	docker run \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(PWD)/data:/app/mounts/data \
			-v $(PWD)/videos:/app/mounts/videos \
			$(DOCKER_ARGS) \
			$(DOCKER_IMAGE) videos-update --mentor $* --data=/app/mounts/data/mentors

.PHONY: videos/shell
videos/shell:
	docker run \
			-it \
			--rm \
			--name $(DOCKER_CONTAINER) \
			-v $(PWD)/data:/app/mounts/data \
			-v $(PWD)/videos:/app/mounts/videos \
			$(DOCKER_ARGS) \
			--entrypoint /bin/bash \
			$(DOCKER_IMAGE)


##################################################################
# Tool to reduce noise a mentor's utterance videos.
#
# NOTE: requires noise sample[s] to be set up under
#
# ./data/mentors/<mentor>/build/noise
#
# ...where each noise sample is a wav file that will be used
# on utterances where the noise-sample file name is a prefix
# if the utterance id, e.g. ./data/mentors/<mentor>/build/noise/s001p001.wav
# will apply to all utterance whose id starts with s001p001
#
# NOTE: this process does NOT automatically rebuild web and mobile videos
# When noise reduction is complete, you should delete existing mobile/web videos
# and then rerun `make videos/mentor-<mentorid>
.PHONY: noise-reduce
noise-reduce-%:
	docker run \
		--rm \
		--name $(DOCKER_CONTAINER) \
		-v $(PWD)/data:/app/mounts/data \
		-v $(PWD)/videos:/app/mounts/videos \
		$(DOCKER_ARGS) \
		$(DOCKER_IMAGE) videos-reduce-noise --mentor $* --data=/app/mounts/data/mentors


# Build checkpoint from mentor data
.PHONY: checkpoint/%
checkpoint/%: data/mentors/%
	cd $(PROJECT_ROOT)/checkpoint && \
	CHECKPOINT=dev_latest $(MAKE) checkpoint-clean/mentor/$* checkpoint-train/mentor/$*
	@echo ""
	@echo "==== MAKE CHECKPOINT SUCCEEDED! ===="
	@echo ""
	@echo "If you have generated mentor videos, you can test the environment locally with:"
	@echo "	cd .. && make local-run-dev"
	@echo ""
	@echo "Then view your mentor here:"
	@echo "	http://localhost:8080/mentorpanel/?mentor=$*"
