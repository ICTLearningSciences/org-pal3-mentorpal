#!/usr/bin/env python
import os
from mentor_classifier.metrics import Metrics
from mentor_classifier.classifiers import create_classifier

ARCH = os.getenv("ARCH")
CHECKPOINT = os.getenv("CHECKPOINT")
CHECKPOINT_ROOT = os.getenv("CHECKPOINT_ROOT") or "/app/checkpoint"
MENTOR = os.getenv("MENTOR")
TEST_SET = os.getenv("TEST_SET")

print(f"ARCH {ARCH}")
print(f"CHECKPOINT {CHECKPOINT}")
print(f"MENTOR {MENTOR}")

classifier = create_classifier(
    checkpoint_root=CHECKPOINT_ROOT, arch=ARCH, checkpoint=CHECKPOINT, mentors=MENTOR
)
metrics = Metrics()
accuracy = metrics.test_accuracy(classifier, TEST_SET)

print(f"  ARCH {ARCH}")
print(f"  CHECKPOINT {CHECKPOINT}")
print(f"  MENTOR {MENTOR}")
print(f"  ACCURACY: {accuracy}")
