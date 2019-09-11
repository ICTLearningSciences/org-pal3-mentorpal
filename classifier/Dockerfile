FROM continuumio/miniconda3

ARG CONDA_ENV=mentorpal
ARG CHECKPOINT=2019-06-13-1900
ARG ARCH=lstm_v1
ARG CHECKPOINT_PATH_RELATIVE=checkpoint/classifiers/${ARCH}/${CHECKPOINT}

ENV CHECKPOINT=${CHECKPOINT}
ENV ARCH=${ARCH}
ENV MENTORPAL_CONDA_ENV=mentorpal

RUN conda create --name=${MENTORPAL_CONDA_ENV} python=3.6
RUN echo "source activate ${MENTORPAL_CONDA_ENV}" > ~/.bashrc
ENV PATH /opt/conda/envs/${MENTORPAL_CONDA_ENV}/bin:$PATH
ADD requirements.txt /tmp/requirements.txt
RUN bash -c "source activate ${MENTORPAL_CONDA_ENV} && \
    pip install -r /tmp/requirements.txt"
RUN rm /tmp/requirements.txt
COPY ./bin /tmp/bin
RUN bash -c "source activate ${MENTORPAL_CONDA_ENV} && \
     python /tmp/bin/nltk_setup.py" && \
     rm -rf /tmp/bin

WORKDIR /app

COPY src .
COPY build/mentors mentors
RUN mkdir -p /app/${CHECKPOINT_PATH_RELATIVE}
COPY build/${CHECKPOINT_PATH_RELATIVE} /app/${CHECKPOINT_PATH_RELATIVE}

COPY build/checkpoint/vector_models /tmp/vector_models
COPY build/bin /tmp/bin
RUN /tmp/bin/checkpoint_vector_models_copy.sh \
        /app/${CHECKPOINT_PATH_RELATIVE} \
        /tmp/vector_models \
        /app/checkpoint/vector_models && \
    rm -rf /tmp/bin && \
    rm -rf /tmp/vector_models

ENV PYTHONPATH=/app:${PYTHONPATH}
