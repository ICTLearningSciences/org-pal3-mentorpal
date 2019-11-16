#!/usr/bin/env bash
BIN="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
${BIN}/run_classifier.sh \
    --entrypoint /app/checkpoint/bin/checkpoint_train.py \
    "$@"
