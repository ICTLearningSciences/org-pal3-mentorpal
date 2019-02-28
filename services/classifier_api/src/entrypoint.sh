#!/usr/bin/env bash

export FLASK_APP=/app/mentorpal_classifier_api

cd /app && gunicorn -b 0.0.0.0:5000 manage:app
# -h 0.0.0.0
#   needs ip set or will be unreachable from host
#   regardless of docker-run port mappings
#
# --without-threads
#   seems like a bad option, but without this
#   keras blows up on second query to a any mentor
#   There are some alternate solutions to try here: https://github.com/keras-team/keras/issues/5640

echo "end of script"

exit 0
