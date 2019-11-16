ARG MENTOR_API_IMAGE=mentorpal-mentor-api
FROM ${MENTOR_API_IMAGE}
RUN apt-get update \
        && apt-get install -y curl \
        && rm -rf /var/lib/apt/lists/*
RUN pip install virtualenv
ENV VIRTUAL_ENV=/test/.venv
COPY build /test
RUN cd /test && \
    virtualenv -p python3 ${VIRTUAL_ENV} && \
    ${VIRTUAL_ENV}/bin/pip install --upgrade pip && \
    ${VIRTUAL_ENV}/bin/pip install -r tests/requirements.txt && \
    ${VIRTUAL_ENV}/bin/pip install -r behave-restful/requirements.txt && \
    ${VIRTUAL_ENV}/bin/pip install -e behave-restful
COPY build/tests/resources/checkpoint /app/checkpoint
COPY build/tests/resources/mentors /app/mentors
ENV PATH="${VIRTUAL_ENV}/bin:$PATH"
