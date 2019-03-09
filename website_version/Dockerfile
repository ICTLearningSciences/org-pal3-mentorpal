FROM continuumio/miniconda3

ARG NODE_ENV
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

WORKDIR /app
COPY build/package*.json .

COPY build/src .
COPY build/mentors mentors
COPY build/checkpoint checkpoint
COPY build/.netrc /root/.netrc

RUN apt-get update
RUN apt-get install -y apt-transport-https
RUN apt-get install -y build-essential
RUN apt-get install -y npm
RUN apt-get install -y cadaver

RUN bash -c "mkdir -p checkpoint/vector_models && \
    cd checkpoint/vector_models && \
	printf \"mget checkpoint/vector_models/*\nexit\" >> cmd && \
	cadaver -r cmd ${WEBDAV_PATH} && \
	rm cmd"

EXPOSE 80
WORKDIR /usr/src/app/website_version
RUN npm install
CMD npm run start