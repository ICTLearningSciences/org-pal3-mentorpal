.PHONY: \
	docker-build-services \
	docker-push-tags-no-build \
	clean \
	docker-compose-up-no-rebuild \
	docker-compose-up

DEV_ENV=mentorpal-dev
dev-env-create:
	cd dev-env && \
		./create.sh ${DEV_ENV}

docker-build-services:
	cd services/web-app && \
		$(MAKE) docker-build

	cd services/mentor-api && \
		$(MAKE) docker-build

	cd services/proxy && \
		$(MAKE) docker-build

docker-push-tags-no-build:
	cd services/web-app && \
		$(MAKE) docker-push-tag
	
	cd services/mentor-api && \
		$(MAKE) docker-push-tag


# TODO: deploy process should...
# 1) fail if any service's repo not committed
# 2) create a git tag w [qa|prod]-${timestamp}
# 3) build and push a docker image with same tag as the git tag
# 4) build docker-compose config (EB version) with correct image tags, secrets, and config
# 5) push tags to docker
# 6) deploy to eb

clean:
	rm -rf build

###############################################################################
# config/config.properties is where we non-sensitive default config for the app
###############################################################################
CONFIG_PROPERTIES=config/config.properties


###############################################################################
# config/secret.properties is where we store passwords for the app
# This file should NEVER be committed to VC
# but a user does need one to run the server locally or to deploy.
###############################################################################
SECRET_PROPERTIES=config/secrets.properties

###############################################################################
# This rule, gives user an explanatory message if config/secret.properties
# is missing from their clone
###############################################################################
${SECRET_PROPERTIES}:
	@echo "you must create a secret.properties file at path ${SECRET_PROPERTIES}"
	@echo "...and it must contain these props:"
	@cat config/dist.secrets.properties
	exit 1

###############################################################################
# Builds a docker-compose.yml for running locally 
# with secrets and other config set
###############################################################################
DOCKER_COMPOSE_BUILD=build/docker-compose.yml
${DOCKER_COMPOSE_BUILD}: ${SECRET_PROPERTIES}
	mkdir -p build
	cp docker-compose-template.yml build/docker-compose.yml

	python bin/apply_properties.py \
		${SECRET_PROPERTIES} \
		build/*.yml

	python bin/apply_properties.py \
		${CONFIG_PROPERTIES} \
		build/*.yml

###############################################################################
# Run the app locally with 'docker-compose up'
# Does NOT clean the existing build directory first (if one exists)
# Once the server is running, you can open the local site in a browser at
# http://localhost:3000
###############################################################################
docker-compose-up-no-rebuild: ${DOCKER_COMPOSE_BUILD}
	source activate ${DEV_ENV} && \
		cd build && \
		docker-compose up
	
	
###############################################################################
# Run the app locally with 'docker-compose up'
# with a clean build of docker-compose.yml
# (updated secrets and config)
###############################################################################
docker-compose-up: clean docker-compose-up-no-rebuild
























###############################################################################
# kubernetes/terraform/kops/eks
#
# The rules below relate to kubernetes and aws deployment thereof.
# As of this writing, we're not going the kubernetes route,
# mainly because the deployment to AWS is too hairy/difficult to fully automate.
#
# For reference, the rules to build and run mentorpal in k8s
# work locally, but the deployment stuff is very WIP
###############################################################################

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