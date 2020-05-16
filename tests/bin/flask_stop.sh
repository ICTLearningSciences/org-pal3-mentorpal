#!/bin/bash
BIN="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
PROJECT_ROOT=$(dirname $(dirname "${BIN}"))
cd ${PROJECT_ROOT} && make stop
