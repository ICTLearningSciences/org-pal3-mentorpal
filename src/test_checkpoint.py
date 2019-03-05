from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.classifier_train_lstm_v1 import TrainLSTMClassifier
from mentorpal.checkpoint import create_checkpoint

metrics = Metrics()

# load default (stable) classifier checkpoint from webdisk
classifier = TrainLSTMClassifier('clint')
id, answer, confidence = metrics.answer_confidence(classifier, 'why did you join the navy?')
accuracy = metrics.test_accuracy_matrix(classifier, 'testing_data_full.csv')

# train a new classifier checkpoint to compare with old
# classifier_new = TrainLSTMClassifier('clint')
# checkpoint = create_checkpoint(classifier_new)
# id_new, answer_new, confidence_new = metrics.answer_confidence(classifier_new, 'why did you join the navy?')
# accuracy_new = metrics.test_accuracy_matrix(classifier_new, 'testing_data_sparse.csv')

# test against a different checkpoint
classifier_other = TrainLSTMClassifier('clint', '2019-03-04-1749')
id_other, answer_other, confidence_other = metrics.answer_confidence(classifier_other, 'why did you join the navy?')
accuracy_other = metrics.test_accuracy_matrix(classifier_other, 'testing_data_full.csv')

print('clint : why did you join the navy?')

print('checkpoint {0} got: {1}\n{2}\n{3}'.format(classifier.checkpoint, id, answer, confidence))
# print('checkpoint {0} got: {1}\n{2}\n{3}'.format(classifier_new.checkpoint, id_new, answer_new, confidence_new))
print('checkpoint {0} got: {1}\n{2}\n{3}'.format(classifier_other.checkpoint, id_other, answer_other, confidence_other))

print('test accuracy for clint:')

print('checkpoint {0}: {1}'.format(classifier.checkpoint, accuracy))
# print('checkpoint {0}: {1}'.format(classifier_new.checkpoint, accuracy_new))
print('checkpoint {0}: {1}'.format(classifier_other.checkpoint, accuracy_other))
