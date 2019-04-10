FROM continuumio/miniconda3

ARG CONDA_ENV=mentorpal
ARG WEBDAV_PATH=https://webdisk.ict.usc.edu/remote.php/webdav/

ENV CHECKPOINT=2019-02-21-0220
ENV CHECKPOINT_1=2019-02-21-0220
ENV CHECKPOINT_2=2019-02-21-0220
ENV MENTOR=clint
ENV TEST_SET=testing_data_full.csv
ENV TRAIN_NEW_CHECKPOINT=False
ENV MENTORPAL_CONDA_ENV=mentorpal

RUN conda create --name=${MENTORPAL_CONDA_ENV} python=3.6

RUN echo "source activate ${MENTORPAL_CONDA_ENV}" > ~/.bashrc
ENV PATH /opt/conda/envs/${MENTORPAL_CONDA_ENV}/bin:$PATH

ADD requirements.txt /tmp/requirements.txt
RUN bash -c "source activate ${MENTORPAL_CONDA_ENV} && \
    pip install -r /tmp/requirements.txt"
RUN rm /tmp/requirements.txt

RUN bash -c "source activate ${MENTORPAL_CONDA_ENV} && \
    python -m nltk.downloader averaged_perceptron_tagger"

RUN apt-get update
RUN apt-get install -y cadaver

WORKDIR /app

COPY build/src .
COPY build/mentors mentors
COPY build/.netrc /root/.netrc

# Download vector models
RUN bash -c "mkdir -p checkpoint/vector_models && \
    cd checkpoint/vector_models && \
	printf \"mget checkpoint/vector_models/*\nexit\" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd"

# Download checkpoints
RUN bash -c "mkdir -p checkpoint/classifiers/lstm_v1/${CHECKPOINT}/clint && \
	cd checkpoint/classifiers/lstm_v1/${CHECKPOINT}/clint && \
	printf \"mget checkpoint/classifiers/lstm_v1/${CHECKPOINT}/clint/*\nexit\" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd"
RUN bash -c "mkdir -p checkpoint/classifiers/lstm_v1/${CHECKPOINT}/dan && \
	cd checkpoint/classifiers/lstm_v1/${CHECKPOINT}/dan && \
	printf \"mget checkpoint/classifiers/lstm_v1/${CHECKPOINT}/dan/*\nexit\" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd"
RUN bash -c "mkdir -p checkpoint/classifiers/lstm_v1/${CHECKPOINT}/carlos && \
	cd checkpoint/classifiers/lstm_v1/${CHECKPOINT}/carlos && \
	printf \"mget checkpoint/classifiers/lstm_v1/${CHECKPOINT}/carlos/*\nexit\" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd"
RUN bash -c "mkdir -p checkpoint/classifiers/lstm_v1/${CHECKPOINT}/julianne && \
	cd checkpoint/classifiers/lstm_v1/${CHECKPOINT}/julianne && \
	printf \"mget checkpoint/classifiers/lstm_v1/${CHECKPOINT}/julianne/*\nexit\" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd"

ENV PYTHONPATH=/app:${PYTHONPATH}
