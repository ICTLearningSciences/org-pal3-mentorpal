#!/usr/bin/env bash

BIN="$( cd "$( dirname "${BASH_SOURCE[0]}" )" >/dev/null 2>&1 && pwd )"
timeout=10

timer=0
echo "waiting for server to respond to ping"
until $(curl --output /dev/null --silent --head --fail http://localhost:5000/mentor-api/ping); do
    printf '.'
    timer=$((timer+1))
    if [[ $timer -gt $timeout ]]; then
        echo
        echo "ERROR: timeout waited ${timeout} secs for server to respond to ping"
        exit 1
    fi
    sleep 1
done

echo 
echo "server ready, running behave tests..."
behave
