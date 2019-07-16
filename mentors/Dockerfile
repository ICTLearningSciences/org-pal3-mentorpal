FROM ubuntu:18.04

RUN apt-get update && \
    apt-get install -y \
        ffmpeg \
        python3.7 \
        python3-pip && \
    rm -rf /var/lib/apt/lists/*

ADD requirements.txt /tmp/requirements.txt
RUN pip3 install -r /tmp/requirements.txt && \
    rm /tmp/requirements.txt

COPY recordings /app/recordings
COPY src /app/src

WORKDIR /app