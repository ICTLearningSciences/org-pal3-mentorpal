#!/usr/bin/env python
import os
from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.classifiers import create_classifier

ARCH = os.getenv('ARCH')
CHECKPOINT = os.getenv('CHECKPOINT')
MENTOR = os.getenv('MENTOR')
TEST_SET = os.getenv("TEST_SET")

print('ARCH {0}'.format(ARCH))
print('CHECKPOINT {0}'.format(CHECKPOINT))
print('MENTOR {0}'.format(MENTOR))

classifier = create_classifier(ARCH, CHECKPOINT, MENTOR)
metrics = Metrics()
accuracy = metrics.test_accuracy(classifier, TEST_SET)

print('ACCURACY: {0}'.format(accuracy))