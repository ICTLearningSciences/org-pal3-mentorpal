#!/bin/bash

KUBERNETES_DIR=${1:-./build/kubernetes}

./bin/kubernetes_deploy.sh ${KUBERNETES_DIR}

# Need to configure AWS to create load balancers for k8s ingress :/
# @see https://aws.amazon.com/blogs/opensource/kubernetes-ingress-aws-alb-ingress-controller/
kubectl apply -f https://raw.githubusercontent.com/kubernetes-sigs/aws-alb-ingress-controller/v1.0.0/docs/examples/rbac-role.yaml
kubectl apply -f ${KUBERNETES_DIR}/alb-ingress-controller.yml

kubectl apply -f ${KUBERNETES_DIR}/mentorpal-org-ingress.yml
