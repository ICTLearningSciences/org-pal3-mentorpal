# Deploying to AWS - Elastic Beanstalk

This document covers deploying a multicontainer-docker app to AWS Elastic Beanstalk using the make rules found in this directory. These deployment scripts use a convention-over-configuration approach, so they should work similarly in any project where you find this deployment set up.

## The Deployment Process at a high level

Assuming you've created a target application and environment in Elastic Beanstalk via the console. The following steps execute a deployment:

 - Checkout the branch for the target env
  
    ```bash
    git checkout <ENV_NAME>
    ```

 - Make sure the branch is up to date with whatever you're intending to deploy
    ```bash
    git checkout development
    git pull
    git checkout <ENV_NAME>
    git merge development
    ```

 - If the branch was not already up to date with development (or whatever branch or tag you're trying to deploy), make sure to test locally before deploying
 
 - Build clean docker images, tagged with the commit hash of the deployment

   ```bash
   make clean docker-build
   ``` 

 - Push those docker tags to docker hub (or whatever registry)
   ```bash
   make docker-push
   ``` 

- Execute the deployment to Elastic Beanstalk
   ```bash
   make clean eb-deploy
   ``` 