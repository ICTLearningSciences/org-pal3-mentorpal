#!/bin/bash

KUBERNETES_DIR=${1:-./build/kubernetes}

minikube stop
minikube delete

minikube start --vm-driver=hyperkit

# assuming we want to use docker images built locally
# but not published to dockerhub.
# we need to do a docker build into minikube's docker
eval $(minikube docker-env)

# ...now actually build all docker services
# (into minikube's docker env)
make docker-build-services

./bin/kubernetes_deploy.sh ${KUBERNETES_DIR}

minikube addons enable ingress
kubectl apply -f ./kubernetes/minikube-ingress.yml

INGRESS_HOST=mentorpal.local
MINIKUBE_IP=$(minikube ip)

echo "
----
In order to test your minikube env in a local web browser
you must use the configured ingress name ${MINIKUBE_IP},
and therefore it must be added to /etc/hosts...

You may be prompted for your password
as scripts attempt to add

    ${MINIKUBE_IP} ${INGRESS_HOST}

...to /etc/hosts
----
"

./bin/set_etc_hosts_ip.sh ${MINIKUBE_IP} ${INGRESS_HOST}

echo "
----
Deployment complete!

to open dashboard, in shell do: 

    minikube dashboard

to view the app, in web browser, do:

    http://${INGRESS_HOST}
----
"
