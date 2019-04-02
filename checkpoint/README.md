# Checkpoints

The checkpoint models can be found [here](https://webdisk.ict.usc.edu/index.php/s/J7IJMxFuax3SiHo): 

These models should not be committed to version control so they are ignored by git.

## Accessing Webdisk

In order to download checkpoints, you will need access to the ICT webdisk.

To access webdisk, you must have a .netrc file in the main app folder. This will not be committed to git.

```
machine webdisk.ict.usc.edu
login [username]
password [password]
```

## Download Checkpoints and Vector Models

Download all vector models and download the current stable checkpoint:

```
make init-checkpoint
```

Download a specific checkpoint:

```
make download-checkpoint classifier=[CLASSIFIER_ID] checkpoint=[CHECKPOINT_ID]
```

Download all vector models:

```
make download-vector-models
```

## Delete Checkpoints

Remove all locally downloaded checkpoints:

```
make remove-checkpoints
```

Remote checkpoints on webdisk must be deleted manually.

## Upload Checkpoints

Upload a specific checkpoint:

```
make upload-checkpoint classifier=[CLASSIFIER_ID] checkpoint=[CHECKPOINT_ID]
```

## Create a Checkpoint

To train and create a new checkpoint for all mentors:

1. Import checkpoint.py from src/mentorpal
2. Call create_checkpoint(classifier) with the classifier you are creating a new checkpoint for
	- classifier must implement train_model()
	- classifier must have a CLASSIFIER_NAME unique id

A new checkpoint will be created under checkpoint/classifiers/[classifier_id]/[current_datetime]

## Compare Checkpoints

To compare a checkpoint to the current stable build, edit and run src/test_classifier.py

See comments in file for more help.