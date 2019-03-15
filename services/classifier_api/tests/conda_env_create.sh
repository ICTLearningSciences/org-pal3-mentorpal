#!/bin/bash

CONDA_ENV_NAME=${1:-mentorpal_classifier_service_testing}

if conda env list | grep -q ${CONDA_ENV_NAME}; then
    echo "${CONDA_ENV_NAME} exists"
    conda env remove -y --name ${CONDA_ENV_NAME}
fi

conda create -y --name ${CONDA_ENV_NAME} pip python=3.7 && \
    source activate ${CONDA_ENV_NAME} && \
    pip install -r requirements.txt && \
    source deactivate

