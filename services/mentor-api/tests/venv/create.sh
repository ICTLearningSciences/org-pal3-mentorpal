#!/bin/bash

DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
CONDA_ENV_NAME=${1:-mentorpal_classifier_service_testing}
BEHAVE_RESTFUL=${2:-"$(cd ${DIR}/../../../../behave-restful; pwd)"}

if conda env list | grep -q ${CONDA_ENV_NAME}; then
    echo "${CONDA_ENV_NAME} exists"
    conda env remove -y --name ${CONDA_ENV_NAME}
fi

if [ ! -f "${BEHAVE_RESTFUL}/behave_restful" ]; then
    echo "initializing submodule behave-restful..."
    cd $(dirname ${BEHAVE_RESTFUL}) && \
        git submodule init && \
        git submodule update
fi

conda create -y --name ${CONDA_ENV_NAME} pip python=3.7 && \
    source activate ${CONDA_ENV_NAME} && \
    pip install -r ${DIR}/requirements.txt && \
    cd ${BEHAVE_RESTFUL} && \
    pip install -r requirements.txt && \
    pip install -e . && \
    source deactivate