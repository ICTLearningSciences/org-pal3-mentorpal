#!/bin/bash

FILEID=0B3dYuDrHnGaYLWtqcTVBQVZCejQ
FILENAME=GoogleNews-vectors-negative300.bin

CONFIRM=$(wget --quiet --save-cookies /tmp/cookies.txt --keep-session-cookies --no-check-certificate https://docs.google.com/uc?export=download&id=${FILEID} -O- | sed -rn 's/.*confirm=([0-9A-Za-z_]+).*/\1\n/p')

echo $CONFIRM
# wget --load-cookies /tmp/cookies.txt \
#     "https://docs.google.com/uc?export=download&confirm=$(wget --quiet --save-cookies /tmp/cookies.txt --keep-session-cookies --no-check-certificate 'https://docs.google.com/uc?export=download&id=${FILEID}' -O- | sed -rn 's/.*confirm=([0-9A-Za-z_]+).*/\1\n/p')&id=${FILEID}" \
#     -O ${FILENAME} && rm -rf /tmp/cookies.txt