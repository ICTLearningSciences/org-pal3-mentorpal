#!/usr/bin/env bash

usage () {
    echo $"
Usage: $0 
        [-h vector-model-host-url] 
        [-o vector-model-target-path] 
    <checkpoint_path>
"
}

BIN="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
CHECKPOINT_ROOT=$( dirname "$BIN" )
VECTOR_MODEL_TARGET_PATH=${CHECKPOINT_ROOT}/vector_models
VECTOR_MODEL_HOST_URL=http://mentorpal-vector-models.s3-website-us-east-1.amazonaws.com

while getopts ":h:o:" OPT_KEY; do
  case ${OPT_KEY} in
    'h' )
      VECTOR_MODEL_HOST_URL=${OPTARG}
      ;;
    'o' )
      VECTOR_MODEL_TARGET_PATH=${OPTARG}
      ;;
    '?' )
      echo "Invalid option: ${OPTARG}" 1>&2
      ;;
    ':' )
      echo "Invalid option: ${OPTARG} requires an argument" 1>&2
      ;;
  esac
done
shift $((OPTIND -1))

CHECKPOINT_PATH=$1; shift;
if [ -z "${CHECKPOINT_PATH}"]; then
    usage
    exit 1
fi

echo "downloading vector models 
  FROM: ${CHECKPOINT_PATH}
  TO: ${VECTOR_MODEL_TARGET_PATH}"

cd ${CHECKPOINT_PATH}
for d in */; do
    mentor=${d%/}
    w2v_file="${mentor}/w2v.txt"
    if [ ! -f "${w2v_file}" ]; then
        # this mentor doesn't require a vector model
        continue
    fi
    vm_name=$(cat ${w2v_file})
    vm_target_path=${VECTOR_MODEL_TARGET_PATH}/${vm_name}
    if [ -f "${vm_target_path}" ]; then
        # vector model already downloaded
        continue
    fi
    download_url=${VECTOR_MODEL_HOST_URL}/${vm_name}
    echo "DOWNLOADING
        MENTOR: ${mentor}
        TARGET: ${vm_target_path}
        SOURCE: ${download_url}
    "
    wget -O ${vm_target_path} ${download_url}
done