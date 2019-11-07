#!/usr/bin/env python

import datetime
import logging
import os
from mentorpal.mentor import Mentor
from mentorpal.classifiers import checkpoint_path
from mentorpal.classifiers.training import find_classifier_training_factory

logging.basicConfig(level=logging.INFO)
ARCH = os.getenv("ARCH")
CHECKPOINT = os.getenv("CHECKPOINT") or datetime.datetime.now().strftime(
    "%Y-%m-%d-%H%M"
)
CHECKPOINT_ROOT = os.getenv("CHECKPOINT_ROOT") or "/app/checkpoint"
MENTORS_ROOT = os.getenv("MENTORS_ROOT") or "/app/mentors"
TEST_MENTOR = os.getenv("TEST_MENTOR")
logging.info(f"ARCH {ARCH}")
logging.info(f"CHECKPOINT {CHECKPOINT}")
logging.info(f"CHECKPOINT_ROOT {CHECKPOINT_ROOT}")
logging.info(f"MENTORS_ROOT {MENTORS_ROOT}")
logging.info(f"TEST_MENTOR {TEST_MENTOR}")
fac = find_classifier_training_factory(ARCH)
cp = checkpoint_path(ARCH, CHECKPOINT, CHECKPOINT_ROOT)
logging.info(f"CHECKPOINT_PATH {cp}")
mentor_ids = (
    [
        d
        for d in os.listdir(MENTORS_ROOT)
        if os.path.isdir(os.path.join(MENTORS_ROOT, d))
    ]
    if not TEST_MENTOR
    else [TEST_MENTOR]
)
logging.info(f"training mentor list: {mentor_ids}")
for mentor_id in mentor_ids:
    if not os.path.isdir(MENTORS_ROOT):
        continue
    m = Mentor(mentor_id, MENTORS_ROOT)
    save_path = os.path.join(cp, mentor_id)
    logging.info(f"train mentor {m.mentor_data_path()} to save path {save_path}...")
    training = fac.create(cp, m)
    scores, accuracy = training.train()
    training.save(to_path=save_path)
    logging.info(f"  CHECKPOINT: {cp}")
    logging.info(f"  ACCURACY: {accuracy}")
