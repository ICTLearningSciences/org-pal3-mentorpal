#!/usr/bin/env bash
BIN="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
${BIN}/run_classifier.sh \
    --entrypoint /app/checkpoint/bin/checkpoint_test.py \
    --additional-args "-e TEST_SET=testing_data_full.csv -v /Users/kirschner/projects/mentor-classifier/mentorpal:/opt/conda/envs/mentorpal/lib/python3.6/site-packages/mentorpal" \
    "$@"
