# Deploying to AWS - Elastic Beanstalk

This document covers deploying a multicontainer-docker app to AWS Elastic Beanstalk using CircleCI

## Publishing to DEV

The method to publish to dev.mentorpal.org is now this:

  - create a new branch *from* `master`
      
      ```
      git fetch --all  # get all the latest from github
      git checkout master   # switch to the master branch
      git pull  # update your local master clone to latest
      git checkout -b <my_new_branch_name>  # create a new branch from master
      ```

  - make your changes and then push to https://dev.mentorpal.org (Elastic Beanstalk env, `dev-mentorpal`) with

      ```
      git push origin <my_new_branch_name>
      ```

      Then on [github](https://github.com/ICTLearningSciences/MentorPAL/) create a pull request. At the bottom of the pull request you will see a list of CircleCi jobs that should include these:
      
        - deploy-to-dev 

            Publishes the PR branch to the Elastic Beanstalk environment that runs https://dev.mentorpal.org.

            You must manually trigger this deployment as follows: 

              - Click `Details` at the right of the job in github to open this workflow in CircleCI
              - Tap the first node to open the Approve dialog
              - Tap `Approve` to start the deployment

## Publishing to QA

The method to publish to https://qa.mentorpal.org is now this:

 - Create a pull request and publish to dev.mentorpal.org following the instructions above
 - Request a review on the pull request
 - Once approved, merge the PR branch back to `master` using the `Squash and Merge` option

 The deployment to `qa-mentorpal` will run automatically when master has been updated with the new merge commit
  
## Publishing to PRODUCTION

The method to publish to https://mentorpal.org is now this:

 - Publish to dev and then qa as described above
 - Have QA test and approve the new version
 - Once approved, create a tag. The tag must has this format `v[0-9]+(\.[0-9]+)*(-prod)`

 The deployment to `prod-mentorpal` when a tag with the format above is created
