FROM continuumio/miniconda3

ARG CONDA_ENV=mentorpal
ARG WEBDAV_PATH=https://webdisk.ict.usc.edu/remote.php/webdav/

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

ENV PYTHONPATH=/app:${PYTHONPATH}
