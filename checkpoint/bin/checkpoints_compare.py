#!/usr/bin/env python
import os
from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.classifiers import create_classifier

mentor = os.environ.get('MENTOR')
c1 = os.environ.get('CHECKPOINT_1')
c2 = os.environ.get('CHECKPOINT_2')
a1 = os.environ.get('ARCH_1')
a2 = os.environ.get('ARCH_2')
test_set = os.environ.get('TEST_SET')

print('-- COMPARING CHECKPOINTS {0} AND {1} --'.format(c1, c2))

classifier = create_classifier(a1, c1, mentor)
classifier_other = create_classifier(a2, c2, mentor)

metrics = Metrics()
accuracy = metrics.test_accuracy(classifier, test_set)
accuracy_other = metrics.test_accuracy(classifier_other, test_set)

print('-- {0} TEST ACCURACY --'.format(mentor))
print('{0}:    {1}'.format(c1, accuracy))
print('{0}:    {1}'.format(c2, accuracy_other))