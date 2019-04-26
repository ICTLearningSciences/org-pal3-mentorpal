#!/usr/bin/env python
import os
from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.classifiers.lstm_v1.train import TrainLSTMClassifier
from mentorpal.checkpoint import create_checkpoint

CHECKPOINT_1 = os.getenv('CHECKPOINT_1')
CHECKPOINT_2 = os.getenv('CHECKPOINT_2')
MENTOR = os.getenv('MENTOR')
TEST_SET = os.getenv("TEST_SET")

classifier = TrainLSTMClassifier(MENTOR, CHECKPOINT_1)
classifier_other = TrainLSTMClassifier(MENTOR, CHECKPOINT_2)

metrics = Metrics()
accuracy = metrics.test_accuracy(classifier, TEST_SET)
accuracy_other = metrics.test_accuracy(classifier_other, TEST_SET)

print('-- COMPARING CHECKPOINTS {0} AND {1} --'.format(CHECKPOINT_1, CHECKPOINT_2))
print('-- {0} TEST ACCURACY --'.format(MENTOR))
print('{0}:    {1}'.format(CHECKPOINT_1, accuracy))
print('{0}:    {1}'.format(CHECKPOINT_2, accuracy_other))