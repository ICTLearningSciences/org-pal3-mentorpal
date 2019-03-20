#!/bin/bash

VENV_NAME=ebs
FORCE=0
DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"

while getopts ":fn:" opt; do
  case ${opt} in
    f )
      FORCE=1
      ;;
    n )
      VENV_NAME=$OPTARG
      ;;
  esac
done
shift $((OPTIND -1))

if conda env list | grep -q "${VENV_NAME}" ; then
    if [ "${FORCE}" = "1" ]; then
        conda env remove -y --name ${VENV_NAME}
    else
        exit 0
    fi
fi


conda env create -f ${DIR}/environment.yml --name ${VENV_NAME} && \
    source activate ${VENV_NAME} && \
    pip install -r requirements.txt && \
    source deactivate

