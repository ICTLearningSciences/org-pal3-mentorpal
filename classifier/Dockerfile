FROM continuumio/miniconda3

ARG CONDA_ENV=mentorpal
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
ENV PYTHONPATH=/app:${PYTHONPATH}
