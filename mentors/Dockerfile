FROM ubuntu:18.04

RUN apt update
RUN apt install -y python3.7 python3-pip
RUN apt install -y ffmpeg

ADD requirements.txt /tmp/requirements.txt
RUN pip3 install -r /tmp/requirements.txt
RUN rm /tmp/requirements.txt

COPY recordings /app/recordings
COPY src /app/src

WORKDIR /app
RUN python3 src/data_pipeline/prepare_data.py recordings/julianne/session1