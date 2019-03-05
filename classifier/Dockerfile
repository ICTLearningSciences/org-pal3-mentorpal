FROM continuumio/miniconda3

ARG CONDA_ENV=mentorpal
ARG CHECKPOINT=2019-2-21-220
ARG WEBDAV_PATH=https://webdisk.ict.usc.edu/remote.php/webdav/

RUN conda create --name=${CONDA_ENV} python=3.6

RUN echo "source activate ${CONDA_ENV}" > ~/.bashrc
ENV PATH /opt/conda/envs/${CONDA_ENV}/bin:$PATH

ADD requirements.txt /tmp/requirements.txt
RUN bash -c "source activate ${CONDA_ENV} && \
    pip install -r /tmp/requirements.txt"
RUN rm /tmp/requirements.txt

RUN bash -c "source activate ${CONDA_ENV} && \
    python -m nltk.downloader averaged_perceptron_tagger"

RUN apt-get update
RUN apt-get install -y cadaver

WORKDIR /app
COPY build/src .
COPY build/mentors mentors
COPY build/checkpoint checkpoint
COPY build/.netrc /root/.netrc

RUN bash -c "mkdir -p checkpoint/vector_models && \
    cd checkpoint/vector_models && \
	printf \"mget checkpoint/vector_models/*\nexit\" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd"

# RUN bash -c "mkdir -p checkpoint/classifiers/lstm_v1/${CHECKPOINT}/clint && \
# 	cd checkpoint/classifiers/lstm_v1/${CHECKPOINT}/clint && \
# 	printf \"mget checkpoint/classifiers/lstm_v1/${CHECKPOINT}/clint/*\nexit\" >> cmd && \
# 	cadaver -r cmd ${WEBDAV_PATH} && \
# 	rm cmd"

# RUN bash -c "mkdir -p checkpoint/classifiers/lstm_v1/${CHECKPOINT}/dan && \
# 	cd checkpoint/classifiers/lstm_v1/${CHECKPOINT}/dan && \
# 	printf \"mget checkpoint/classifiers/lstm_v1/${CHECKPOINT}/dan/*\nexit\" >> cmd && \
# 	cadaver -r cmd ${WEBDAV_PATH} && \
# 	rm cmd"

# RUN bash -c "mkdir -p checkpoint/classifiers/lstm_v1/${CHECKPOINT}/carlos && \
# 	cd checkpoint/classifiers/lstm_v1/${CHECKPOINT}/carlos && \
# 	printf \"mget checkpoint/classifiers/lstm_v1/${CHECKPOINT}/carlos/*\nexit\" >> cmd && \
# 	cadaver -r cmd ${WEBDAV_PATH} && \
# 	rm cmd"

# RUN bash -c "mkdir -p checkpoint/classifiers/lstm_v1/${CHECKPOINT}/julianne && \
# 	cd checkpoint/classifiers/lstm_v1/${CHECKPOINT}/julianne && \
# 	printf \"mget checkpoint/classifiers/lstm_v1/${CHECKPOINT}/julianne/*\nexit\" >> cmd && \
# 	cadaver -r cmd ${WEBDAV_PATH} && \
# 	rm cmd"
