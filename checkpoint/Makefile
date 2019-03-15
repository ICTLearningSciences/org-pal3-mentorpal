CHECKPOINT_ROOT=$(shell pwd)
MENTORPAL_ROOT=$(shell dirname ${CHECKPOINT_ROOT})

WEBDAV_PATH=https://webdisk.ict.usc.edu/remote.php/webdav/
CHECKPOINT?=2019-2-21-220

remove-checkpoints:
	rm -r classifiers/*/*/*/*
	rm -r vector_models/*.bin

init-checkpoint: 
	$(MAKE) download-checkpoint classifier=lstm_v1 checkpoint=${CHECKPOINT}
	$(MAKE) download-vector-models


# make classifier={CLASSIFIER} checkpoint={CHECKPOINT} download-checkpoint
#
# download a specific checkpoint from webdisk
# must have a .netrc file with webdisk credentials to run this (see checkpoint/README.md)
download-checkpoint:
	cp ${MENTORPAL_ROOT}/.netrc ~/.netrc

	mkdir -p classifiers/$(classifier)/$(checkpoint)/clint
	cd classifiers/$(classifier)/$(checkpoint)/clint && \
	printf "mget classifiers/$(classifier)/$(checkpoint)/clint/*\nexit" > cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

	mkdir -p classifiers/$(classifier)/$(checkpoint)/dan
	cd classifiers/$(classifier)/$(checkpoint)/dan && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/dan/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

	mkdir -p classifiers/$(classifier)/$(checkpoint)/carlos
	cd classifiers/$(classifier)/$(checkpoint)/carlos && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/carlos/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

	mkdir -p classifiers/$(classifier)/$(checkpoint)/julianne
	cd classifiers/$(classifier)/$(checkpoint)/julianne && \
	printf "mget checkpoint/classifiers/$(classifier)/$(checkpoint)/julianne/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

download-vector-models:
	cp ${MENTORPAL_ROOT}/.netrc ~/.netrc
	cd vector_models && \
	printf "mget checkpoint/vector_models/*\nexit" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd

# make classifier={CLASSIFIER} checkpoint={CHECKPOINT} upload-checkpoint
#
# upload a specific checkpoint to webdisk
# must have a .netrc file with webdisk credentials to run this (see checkpoint/README.md)
upload-checkpoint:
	cp ${MENTORPAL_ROOT}/.netrc ~/.netrc
	cp README.md classifiers/$(classifier)/$(checkpoint)
	cd checkpoint && \
	./davupload.sh "classifiers/$(classifier)/$(checkpoint)/" "https://webdisk.ict.usc.edu/remote.php/webdav/checkpoint/classifiers/$(classifier)/"