#!/bin/bash

KUBERNETES_DIR=${1:-./build/kubernetes}

echo "Creating the secrets store..."
kubectl apply -f ${KUBERNETES_DIR}/secrets.yml

echo "Creating the classifier-api deployment and service..."

kubectl apply -f ${KUBERNETES_DIR}/classifier-api-deployment.yml
kubectl apply -f ${KUBERNETES_DIR}/classifier-api-service.yml

echo "Creating the web_app deployment and service..."
kubectl apply -f ${KUBERNETES_DIR}/web-app-deployment.yml
kubectl apply -f ${KUBERNETES_DIR}/web-app-service.yml
