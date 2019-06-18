#!/usr/bin/env python
import os
from mentorpal.metrics import Metrics
from mentorpal.classifiers import create_classifier

mentor = os.environ.get("MENTOR")
c1 = os.environ.get("CHECKPOINT_1")
c2 = os.environ.get("CHECKPOINT_2")
a1 = os.environ.get("ARCH_1")
a2 = os.environ.get("ARCH_2")
test_set = os.environ.get("TEST_SET")
ch_root = os.getenv("CHECKPOINT_ROOT") or "/app/checkpoint"

print(f"-- COMPARING CHECKPOINTS {a1}/{c1} AND {a2}/{c2} for mentor {mentor} --")

classifier = create_classifier(a1, c1, mentor, ch_root)
classifier_other = create_classifier(a2, c2, mentor, ch_root)

metrics = Metrics()
accuracy = metrics.test_accuracy(classifier, test_set)
accuracy_other = metrics.test_accuracy(classifier_other, test_set)

print(f"-- {mentor} TEST ACCURACY --")
print(f"{a1}/{c1}:    {accuracy}")
print(f"{a2}/{c2}:    {accuracy}")
