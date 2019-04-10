#!/bin/bash

import os
from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.classifier_train_lstm_v1 import TrainLSTMClassifier

CHECKPOINT = os.getenv('CHECKPOINT')
MENTOR = os.getenv('MENTOR')
TEST_SET = os.getenv("TEST_SET")

classifier = TrainLSTMClassifier(MENTOR, CHECKPOINT)

metrics = Metrics()
accuracy = metrics.test_accuracy(classifier, TEST_SET)

print('CHECKPOINT {0}'.format(CHECKPOINT))
print('MENTOR {0}'.format(MENTOR))
print('ACCURACY: {0}'.format(accuracy))