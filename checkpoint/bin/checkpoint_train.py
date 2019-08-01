#!/usr/bin/env python

import datetime
import os
from mentorpal.mentor import Mentor
from mentorpal.classifiers import checkpoint_path
from mentorpal.classifiers.training import find_classifier_training_factory

ARCH = os.getenv("ARCH")
CHECKPOINT = os.getenv("CHECKPOINT") or datetime.datetime.now().strftime(
    "%Y-%m-%d-%H%M"
)
CHECKPOINT_ROOT = os.getenv("CHECKPOINT_ROOT") or "/app/checkpoint"
MENTORS_ROOT = os.getenv("MENTORS_ROOT") or "/app/mentors"
TEST_MENTOR = os.getenv("TEST_MENTOR")
print(f"ARCH {ARCH}")
print(f"CHECKPOINT {CHECKPOINT}")
print(f"CHECKPOINT_ROOT {CHECKPOINT_ROOT}")
print(f"MENTORS_ROOT {MENTORS_ROOT}")
print(f"TEST_MENTOR {TEST_MENTOR}")
fac = find_classifier_training_factory(ARCH)
cp = checkpoint_path(ARCH, CHECKPOINT, CHECKPOINT_ROOT)
mentor_list = os.listdir(MENTORS_ROOT) if not TEST_MENTOR else [TEST_MENTOR]
for mentor_id in mentor_list:
    mp = os.path.join(MENTORS_ROOT, mentor_id, "data")
    if not os.path.isdir(mp):
        continue
    print(f"train mentor {mp}...")
    m = Mentor(mentor_id, mp)
    training = fac.create(cp, m)
    scores, accuracy = training.train()
    training.save()
    print(f"  CHECKPOINT: {cp}")
    print(f"  ACCURACY: {accuracy}")
