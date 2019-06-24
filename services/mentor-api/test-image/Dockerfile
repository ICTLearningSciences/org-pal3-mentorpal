ARG MENTOR_API_IMAGE=mentorpal-mentor-api
FROM ${MENTOR_API_IMAGE}

RUN pip install virtualenv
ENV VIRTUAL_ENV=/test/.venv
COPY build /test
RUN cd /test && \
    virtualenv -p python3 ${VIRTUAL_ENV} && \
    ${VIRTUAL_ENV}/bin/pip install --upgrade pip && \
    ${VIRTUAL_ENV}/bin/pip install -r tests/requirements.txt && \
    ${VIRTUAL_ENV}/bin/pip install -r behave-restful/requirements.txt && \
    ${VIRTUAL_ENV}/bin/pip install -e behave-restful
ENV PATH="${VIRTUAL_ENV}/bin:$PATH"
