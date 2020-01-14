## Mentor Pipeline
---------------

Use these tools to create/update a mentor for Mentorpal.

### Quick Start

#### Required Setup (session videos and timstamps)
TODO: needs to download session videos and timestamp files automatically but for now...
Download session videos and timestamps and place them under `./data/mentors/{mentor_id}/build/recordings` eg.

```
data/mentors/my_new_mentor/
├── build
│   ├── recordings
│   │   ├── session1
│   │   │   ├── p001-bio-long.csv
│   │   │   ├── p001-bio-long.mp4
│   │   │   ├── p002-some-utterances.csv
│   │   │   ├── p002-some-utterances.mp4
│   │   ├── session2
│   │   │   ├── p001-more-questions.csv
│   │   │   ├── p001-more-questions.mp4
```

#### Build and Test a Mentor

If raw video, audio and timestamp files for a mentor are stored in S3 (more on this
below), we can use the following commands to build a classifier for the mentor.
Note that videos are not required to generate a classifier to a new mentor.

##### Create/update the training data
```bash
make data/mentors/{mentor_id}
```

##### Train {mentor} classifier
```bash
make checkpoint/{mentor_id}
```

#### Run mentorpal cluster with {mentor} data and classifier
```bash
cd .. && make local-run-dev
```

### Generate web videos (if you're ready to run the website and not just classifier)
```bash
make videos/mentors/{mentor_id}
```

#### Example endpoints for mentorpal cluster
- Mentor Homepage (Test web site) `http://localhost:8080/mentorpanel/?mentor={mentor}`
- Mentor API (Test classifier, e.g. with [Postman](https://www.getpostman.com/downloads/)) `http://localhost:8080/mentor-api/questions/?mentor={mentor}&query={question}`

---------------
### Pipeline Overview
The classification data pipeline can be used to create all data needed for a usable
mentor from raw recording files.

### Output
After running the pipeline the following files will be generated:
- `{mentor}/data/classifier_data.csv`
- `{mentor}/data/topics.csv`
- `{mentor}/data/utterance_data.csv`
- `videos/{mentor}/mobile/idle.mp4`
- `videos/{mentor}/web/idle.mp4`
- `videos/{mentor}/mobile/{mentor}_{video_id}.mp4`
- `videos/{mentor}/web/{mentor}_{video_id}.mp4`

### Supplementary Documentation
#### Generating Timestamp Files
After the interview is done, watch it fully and note down the start and end timestamps
for each question. Timestamp files should be in a CSV file of the following format:

| Notes    | Answer/Utterance | Question | Response start       | Response end         |
|----------|------------------|----------|----------------------|----------------------|
| (string) | (char: A/U)      | (string) | (timestamp HH:MM:SS) | (timestamp HH:MM:SS) |

DEV
---

### Make/ENV variables for DEV

When you're working on the mentor-pipeline tool set, you frequently want to run `make` rules with a local build of the `mentor-pipeline` docker image and/or local copies of the python source for its python modules. The `Makefile` has a number of variables to support local development.



**NOTE**

All the examples below prepend variables to a `make` call, but you can also always `export` any of these variables once and they will stay in effect for the remainder of your shell session, e.g.

```bash
export DOCKER_IMAGE=mentor-pipeline:latest
# then later ...
make shell
```

...instead of 

```bash
DOCKER_IMAGE=mentor-pipeline:latest make shell
```

#### DOCKER_IMAGE

Change the `mentor-pipeline` docker image from the current published release, e.g.

Change the docker image for a single make call like this

```bash
DOCKER_IMAGE=mentor-pipeline:latest make shell
```

...or configure it for your shell session like this

```bash
export DOCKER_IMAGE=mentor-pipeline:latest 
```

#### DEV_ENABLED

Set `DEV_ENABLED` to have `make` rules run with local source for python modules. Will only use local sources for specific modules if the source is found at default (or configured) paths (details below)

```
DEV_ENABLED=1 make shell
```

#### DEV_ROOT

A default root for all python modules in dev. If you have set `DEV_ENABLED=1` and any of the python modules listed below are cloned there, they will automatically be includes. The default value for `DEV_ROOT` is `~/projects`

#### DEV_MENTOR_PIPELINE

Override the path to where [mentor-pipeline](https://github.com/ICTLearningSciences/mentor-pipeline) is cloned. ***NOTE*** source will only be used if `DEV_ENABLED=1`

#### DEV_TRANSCRIBE

Override the path to where [py-transcribe](https://github.com/ICTLearningSciences/py-transcribe) is cloned. ***NOTE*** source will only be used if `DEV_ENABLED=1`

#### DEV_TRANSCRIBE_AWS

Override the path to where [py-transcribe-aws](https://github.com/ICTLearningSciences/py-transcribe-aws) is cloned. ***NOTE*** source will only be used if `DEV_ENABLED=1`

### Running mentor-pipeline docker shell

You can open a shell to the pipeline docker image like this:

```bash
make shell
```

All dev variables described above will apply to the shell.

Once in the docker shell, you can run the pipeline script directly, e.g.

```
python mentor_pipeline_runner.py --mentor some_mentor_id --data-update --data=/app/mounts/data/mentors
```