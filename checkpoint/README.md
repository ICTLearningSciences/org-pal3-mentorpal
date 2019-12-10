Checkpoints
-----------

## Required Software

- OSX or Linux
- make
- python3
- git + git lfs

## Local Checkpoints

You can train and use checkpoints locally. Here are some common operations:

### Train a New Checkpoint 

To train a new checkpoint do

```bash
# train a new checkpoint with the default ARCH from Makefile
make checkpoint-train
```

By default this will  train all mentors found under `$MENTORPAL/mentor`, create a new checkpoint at `$MENTORPAL/checkpoint/classifiers/$ARCH/yyyy-MM-dd-HHmm` and save the trained weights to the checkpoint.

If you want to train with a different architecture, do

```bash
# my_arch should be a module in mentorpal at mentor_classifier.classifiers.arch.my_arch
ARCH=my_arch \
make checkpoint-train
```

If you want to train a checkpoint with a name other than the current datetime, do

```bash
# checkpoint is passed as arg below to make it harder 
# to accidentally overwrite existing default checkpoint configured in Makefile
make checkpoint-train checkpoint=my_checkpoint
```

### Test a Checkpoint 

To run a standard accuracy test the current configured checkpoint

```bash
# test the checkpoint configured by ARCH and CHECKPOINT in the Makefile
make checkpoint-test
```

To test a specific checkpoint do

```bash
# my_arch should be a module in mentorpal at mentor_classifier.classifiers.arch.my_arch
# my_checkpoint should be an existing checkpoint at $MENTORPAL/checkpoint/classifiers/$myarch/$my_checkpoint
ARCH=my_arch CHECKPOINT=my_checkpoint \
make checkpoint-test
```

An example with real values might look like this:

```bash
ARCH=lstm_v1 CHECKPOINT=2019-05-01-2209 \
make checkpoint-test
```

### Compare 2 Checkpoints

To compare 2 checkpoints with the standard accuracy test do 

```bash
make checkpoints-compare \
mentor=my_mentor \
arch_1=my_arch_1 checkpoint_1=my_checkpoint_1 \
arch_2=my_arch_2 checkpoint_2=my_checkpoint_2
```

