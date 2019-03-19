#!/usr/bin/env bash

export FLASK_APP=/app/mentorpal_mentor-api

cd /app && gunicorn -b 0.0.0.0:5000 manage:app
# -h 0.0.0.0
#   needs ip set or will be unreachable from host
#   regardless of docker-run port mappings

echo "end of script"

exit 0
