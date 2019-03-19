#!/bin/bash
NAME=${1:-mentorpal-dev}
conda create --name $NAME pip python=3.6
source activate ${NAME} && pip install -r requirements.txt