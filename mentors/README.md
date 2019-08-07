## Classification Data Pipeline Info
---------------

### Quick Start

#### Build and Test a Classifier for a New Mentor
If raw video, audio and timestamp files for a mentor are stored in S3 (more on this
below), we can use the following commands to build a classifier for the mentor.
Note that videos are not required to generate a classifier to a new mentor.

##### Run a Build of {mentor} (excluding videos)
- `make {mentor}/data`

##### Update the Build of {mentor} (if the {mentor}/data folder exists)
- `make {mentor}/data/update`

##### Train {mentor} Classifier (after the data folder has been generated)
- `cd ../checkpoint`
- `make checkpoint-train/mentor/{mentor}`

#### Run a Full Build of {mentor} with videos
- `make {mentor}/videos`

---------------
### Pipeline Overview
The classification data pipeline can be used to create all data needed for a usable
mentor from raw recording files.

### Prerequisites
As a prerequisite of running the pipeline the following files are needed for each
part of each session. These files should be uploaded into the `mentorpal-source-videos`
S3 bucket in `usc-ict-aws-mentor-pal` AWS account:
- `{mentor}/data/recordings/session{session#}/part{part#}_video.mp4`
- `{mentor}/data/recordings/session{session#}/part{part#}_audio.wav`
- `{mentor}/data/recordings/session{session#}/part{part#}_timestamps.csv`

### Output
After running the pipeline the following files will be generated:
- `{mentor}/data/classifier_data.csv`
- `{mentor}/data/metadata.csv`
- `{mentor}/data/topics.csv`
- `{mentor}/data/utterance_data.csv`

Additionally the following intermediate build files will be generated. These can
be used to debug different parts of a pipeline
- `{mentor}/build/recordings/session{session#}/out/audiochunks/*`
- `{mentor}/build/recordings/session{session#}/out/transcript.csv`
- `{mentor}/data/questions_paraphrases_answers.csv`
- `{mentor}/data/prompts_utterances.csv`

### Usage
Pipeline usage is fully documented in the Makefile.
- `make {mentor}/data` runs a full build of {mentor} data if data folder is not present
- `make {mentor}/data/update` runs a full build of {mentor} data regardless of whether data folder is present
- `make {mentor}/video` runs a full build of {mentor} data and videos if data folder is not present
- `make {mentor}/video/update` runs a full build of {mentor} data and videos regardless of whether data folder is present
- `make {mentor}/build` downloads and preprocesses {mentor} data if build folder is not present
- `make {mentor}/build/update` downloads and preprocesses {mentor} data  regardless of whether build folder is present
- `make shell` opens an interactive terminal in the data pipeline docker image.
Useful for debugging these scripts
- `make docker-build` rebuilds the data pipeline docker container. Useful for developing these scripts.
- `make clean` removes all build data for all mentors
- `make clean/{mentor}` removes build data for {mentor}

### Supplementary Documentation
#### Generating Timestamp Files
After the interview is done, watch it fully and note down the start and end timestamps
for each question. Timestamp files should be in a CSV file of the following format:

| Notes    | Answer/Utterance | Question | Response start       | Response end         |
|----------|------------------|----------|----------------------|----------------------|
| (string) | (char: A/U)      | (string) | (timestamp HH:MM:SS) | (timestamp HH:MM:SS) |

##### Troubleshooting of timestamps (Appended 6/19/18..if you need help since it's a pain kshaw@gatech.edu has touched it most recently)
1. Extra lines can't exist in the csv since ",,,," will break the python script and believe that the columns are empty
2. The filenames must be exact even in lower/uppercase
3. Any generated files must be deleted if you want to run the generator again, or it will give a exit code 1 error.
4. The column names in the csv need to be exact even in case or Pandas error might occur.

#### Editing Transcripts, Topics, Tags and Paraphrases
After running the build step, transcript files are automatically generated using
our transcript service's (currently IBM Watson) interpretation of the audiochunks.
These may not be completely accurate, especially with proper nouns. Thus, to ensure
accuracy, users may want to manually edit these files. Users have the option to
edit the mentor's responses, topics, tags and paraphrases in the following files:
- Edit `{mentor}/data/questions_paraphrases_answers.csv` and `{mentor}/data/prompts_utterances.csv` after running `make {mentor}/data`
