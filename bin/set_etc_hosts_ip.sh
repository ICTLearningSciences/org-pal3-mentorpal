#!/bin/bash

IP=$1
HOSTNAME=$2

if [ -z ${HOSTNAME} ]; then
    echo "usage set_etc_hosts_ip ip host"
    exit 1
fi

TGT_FILE=/etc/hosts

if grep -q ${HOSTNAME} ${TGT_FILE}; then
    sudo sed -i '' "/${HOSTNAME}/ s/.*/${IP}$(printf '\t')${HOSTNAME}/g" ${TGT_FILE}
    echo "${IP} ${HOSTNAME} (replaced ${TGT_FILE} entry)"
else
    echo "${IP} ${HOSTNAME}" | sudo tee -a ${TGT_FILE}
fi 
