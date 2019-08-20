#!/bin/bash

if ! [ -x "$(command -v pip)" ]; then
    echo 'Error: pip is not installed.' >&2
    exit 1
fi

if ! [ $(pip freeze | grep virtualenv) ]; then
    pip install virtualenv
fi