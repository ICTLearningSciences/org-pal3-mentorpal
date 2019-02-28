#
# Phony targets.
#
.PHONY: help

docker-build-services:
	cd services/web_app && \
		$(MAKE) docker-build

	cd services/classifier_api && \
		$(MAKE) docker-build

docker-push-tags-no-build:
	cd services/web_app && \
		$(MAKE) docker-push-tag
	
	cd services/classifier_api && \
		$(MAKE) docker-push-tag

clean:
	rm -rf build

SECRET_PROPERTIES=config/secrets.properties
CONFIG_PROPERTIES=config/config.properties

${SECRET_PROPERTIES}:
	@echo "you must create a secret.properties file at path ${SECRET_PROPERTIES}"
	@echo "...and it must contain these props:"
	@cat config/dist.secrets.properties
	exit 1

build/kubernetes: ${SECRET_PROPERTIES}
	mkdir -p build
	rm -rf build/kubernetes
	cp -r kubernetes build

	python bin/apply_properties.py \
		${SECRET_PROPERTIES} \
		build/kubernetes/*.yml

	python bin/apply_properties.py \
		${CONFIG_PROPERTIES} \
		build/kubernetes/*.yml

# TODO: right now kubernetes pulling docker images from docker hub, 
# so you need to rebuild for each test?
# Change so that it uses local images during dev
kubernetes-deploy-local-no-rebuild: build/kubernetes
	./bin/kubernetes_deploy_local.sh

# TODO: right now kubernetes pulling docker images from docker hub, 
# so you need to rebuild for each test?
# Change so that it uses local images during dev
kubernetes-deploy-prod-no-rebuild: build/kubernetes
	./bin/kubernetes_deploy_prod.sh

kubernetes-deploy-local: clean kubernetes-deploy-local-no-rebuild


kubernetes-deploy-prod: clean kubernetes-deploy-prod-no-rebuild

eks-install:
	# TODO - support for not just osx
	# TODO - check if already installed
	brew install weaveworks/tap/eksctl

CLUSTER_NAME?=mentorpal-test
AWS_REGION?=us-east-1
AWS_ZONES?=us-east-1a,us-east-1b
AWS_NODE_TYPE?=t2.large # for now need large because of mem specs
NODE_COUNT_PREFERRED=1
NODE_COUNT_MIN?=1
NODE_COUNT_MAX?=3

eks-create-cluster:
	eksctl create cluster \
		--name=${CLUSTER_NAME} \
		--region=${AWS_REGION} \
		--zones=${AWS_ZONES} \
		--node-type=${AWS_NODE_TYPE} \
		--nodes=${NODE_COUNT_PREFERRED} \
		--nodes-min=${NODE_COUNT_MIN} \
		--nodes-max=${NODE_COUNT_MAX}



terraform/plan.tf:
	cd terraform && \
		terraform init && \
		terraform plan -out plan.tf

tf-clean:
	rm terraform/plan.tf

tf-plan: tf-clean terraform/plan.tf
	
tf-apply: terraform/plan.tf
	cd terraform && \
	terraform apply --auto-approve plan.tf

	
cluster-validate-ingress-controller:
	kubectl logs -n kube-system $(kubectl get po -n kube-system | egrep -o alb-ingress[a-zA-Z0-9-]+)

cluster-validate-ingress:
	kubectl get ingress/2048-ingress -n 2048-game -o wide