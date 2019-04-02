from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.classifier_train_lstm_v1 import TrainLSTMClassifier
from mentorpal.checkpoint import create_checkpoint

TRAIN_NEW_CHECKPOINT = True            # IF TRAINING A NEW CHECKPOINT FROM A CLASSIFIER, SET THIS AS True
checkpoint = '2019-02-21-0220'          # REPLACE WITH ID OF (PRE-EXISTING) CHECKPOINT TO TEST (IF NOT TRAINING A NEW CHECKPOINT)
mentor = 'clint'                        # REPLACE WITH ID OF MENTOR TO TEST
test_set = 'testing_data_full.csv'      # REPLACE WITH NAME OF TEST DATA FILE TO USE


# load stable classifier checkpoint to test against
classifier = TrainLSTMClassifier(mentor)            # can replace classifier_train_lstm_v1 with a different classifier

# create and train a new checkpoint for a classifier
if (TRAIN_NEW_CHECKPOINT):
    classifier_new = TrainLSTMClassifier(mentor)    # can replace classifier_train_lstm_v1 with a different classifier
    checkpoint = create_checkpoint(classifier_new)

# load classifier checkpoint to test
classifier_other = TrainLSTMClassifier(mentor, checkpoint)


metrics = Metrics()
accuracy = metrics.test_accuracy(classifier, test_set)
accuracy_other = metrics.test_accuracy(classifier_other, test_set)

print('-- COMPARING CHECKPOINTS {0} AND {1} --'.format(classifier.checkpoint, classifier_other.checkpoint))
print('-- {0} TEST ACCURACY --'.format(mentor))
print('{0}:\n    {1}'.format(classifier.checkpoint, accuracy))
print('{0}:\n    {1}'.format(classifier_other.checkpoint, accuracy_other))

assert accuracy_other > accuracy