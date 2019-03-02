from mentorpal.checkpoint import create_checkpoint, download_checkpoint, upload_checkpoint
from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.classifier_train_lstm_v1 import TrainLSTMClassifier

metrics = Metrics()

# load default (stable) classifier checkpoint from webdisk
classifier_stable = TrainLSTMClassifier('clint')

# create a new classifier checkpoint and save it to webdisk
classifier_current = TrainLSTMClassifier('clint')
create_checkpoint(classifier_current)

# load a specific classifier checkpoint from webdisk
classifier_other = TrainLSTMClassifier('clint', '2019-03-01-1731')

id_stable, answer_stable, confidence_stable = metrics.answer_confidence(classifier_stable, 'why did you join the navy?')
id_current, answer_current, confidence_current = metrics.answer_confidence(classifier_current, 'why did you join the navy?')
id_other, answer_other, confidence_other = metrics.answer_confidence(classifier_other, 'why did you join the navy?')

accuracy_stable, num_stable = metrics.test_accuracy_matrix(classifier_stable, 'testing_data_sparse.csv')
accuracy_current, num_current = metrics.test_accuracy_matrix(classifier_current, 'testing_data_sparse.csv')
accuracy_other, num_other = metrics.test_accuracy_matrix(classifier_other, 'testing_data_sparse.csv')

print('clint : why did you join the navy?')

print('stable checkpoint {0} got: '.format(classifier_stable.checkpoint))
print('{0}\n{1}\n{2}'.format(id_stable, answer_stable, confidence_stable))

print('current checkpoint {0} got: '.format(classifier_current.checkpoint))
print('{0}\n{1}\n{2}'.format(id_current, answer_current, confidence_current))

print('other checkpoint {0} got: '.format(classifier_other.checkpoint))
print('{0}\n{1}\n{2}'.format(id_other, answer_other, confidence_other))

print('test accuracy for clint on set of {0} questions:'.format(num_stable))
print('stable checkpoint {0}: {1}'.format(classifier_stable.checkpoint, accuracy_stable))
print('current checkpoint {0}: {1}'.format(classifier_current.checkpoint, accuracy_current))
print('other checkpoint {0}: {1}'.format(classifier_other.checkpoint, accuracy_other))

# assert accuracy_current >= accuracy_stable