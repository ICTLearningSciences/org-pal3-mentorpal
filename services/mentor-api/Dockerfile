ARG MENTORPAL_CLASSIFIER_IMAGE=uscictdocker/mentor-classifier:latest
FROM ${MENTORPAL_CLASSIFIER_IMAGE}

# this should be set by the base image, mainly here for documentation purpose
ENV MENTORPAL_CONDA_ENV=${MENTORPAL_CONDA_ENV}
ENV TINI_VERSION=v0.16.1

ADD requirements.txt /tmp/requirements.txt
RUN bash -c "source activate ${MENTORPAL_CONDA_ENV} && \
    pip install -r /tmp/requirements.txt"
RUN rm /tmp/requirements.txt

ENV FLASK_APP=mentor_classifier_service

WORKDIR /app
COPY src .

# add detectron_extra to PATH and PYTHONPATH
ENV PATH /app/bin:${PATH}
ENV PYTHONPATH /app:${PYTHONPATH}

RUN chmod +x /app/entrypoint.sh

# We need to run our api through a proper unix init service, using tini
ADD https://github.com/krallin/tini/releases/download/${TINI_VERSION}/tini /tini
RUN chmod +x /tini 
ENTRYPOINT ["/tini", "--", "/app/entrypoint.sh"]