#!/usr/bin/env bash

usage () {
    echo $"
Usage: $0 
    <checkpoint_path> <vector_models_from> <vector_models_to>
"
}

CHECKPOINT_PATH=$1 
VECTOR_MODELS_FROM=$2
VECTOR_MODELS_TO=$3
if [ ! -d "${CHECKPOINT_PATH}" ]; then
    echo "<checkpoint> arg missing or not a valid path: ${CHECKPOINT_PATH}"
    usage
    exit 1
fi
if [ ! -d "${VECTOR_MODELS_FROM}" ]; then
    echo "<vector_models_from> arg missing or not a valid path: ${VECTOR_MODELS_FROM}"
    usage
    exit 1
fi
if [ -z "${VECTOR_MODELS_TO}" ]; then
    echo "<vector_models_to> arg missing"
    usage
    exit 1
fi

echo "copying vector models for checkpoint
  CHECKPOINT: ${CHECKPOINT_PATH} 
  FROM: ${VECTOR_MODELS_FROM}
  TO: ${VECTOR_MODELS_TO}"

mkdir -p ${VECTOR_MODELS_TO}
CHECKPOINT_PATH=$( cd ${CHECKPOINT_PATH} && pwd )
VECTOR_MODELS_FROM=$( cd ${VECTOR_MODELS_FROM} && pwd )
VECTOR_MODELS_TO=$( cd ${VECTOR_MODELS_TO} && pwd )

cd ${CHECKPOINT_PATH}
dir=$(pwd)
echo "in $dir"
for d in */; do
    mentor=${d%/}
    w2v_file="${mentor}/w2v.txt"
    if [ ! -f "${w2v_file}" ]; then
        # this mentor doesn't require a vector model
        continue
    fi
    vm_name=$(cat ${w2v_file})
    vm_to_path=${VECTOR_MODELS_TO}/${vm_name}
    if [ -f "${vm_to_path}" ]; then
        # vector model already copied
        continue
    fi
    vm_from_path=${VECTOR_MODELS_FROM}/${vm_name}
    echo "COPYING
        MENTOR: ${mentor}
        FROM: ${vm_from_path}
        TO: ${vm_to_path}
    "
    cp ${vm_from_path} ${vm_to_path}
done