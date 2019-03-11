from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.classifier_train_lstm_v1 import TrainLSTMClassifier as Classifier1
from mentorpal.classifier_train_lstm_v2 import TrainLSTMClassifierV2 as Classifier2
from mentorpal.checkpoint import create_checkpoint

checkpoint = '2019-3-11'
mentor = 'clint'
test_set = 'testing_data_full.csv'
question = 'why did you join the navy?'
metrics = Metrics()

# load default (stable) classifier checkpoint from webdisk
classifier = Classifier1(mentor)
id, answer, confidence = metrics.answer_confidence(classifier, question)
accuracy = metrics.test_accuracy(classifier, test_set)

# train a new classifier checkpoint to compare with old
classifier_new = Classifier2(mentor, checkpoint)
classifier_new.train_model()
id_new, answer_new, confidence_new = metrics.answer_confidence(classifier_new, question)
accuracy_new = metrics.test_accuracy(classifier_new, test_set)

print('comparing checkpoint {0} to {1}:'.format(classifier.checkpoint, classifier_new.checkpoint))

print('{0} : {1}'.format(mentor, question))

print(' - {0}:'.format(classifier.checkpoint))
print('    {1} {2} {3}'.format(id, answer, confidence))
print(' - {0}:'.format(classifier_new.checkpoint))
print('    {1} {2} {3}'.format(id_new, answer_new, confidence_new))

print('test accuracy for clint:')

print(' - {0}:\n    {1}'.format(classifier.checkpoint, accuracy))
print('    {1}'.format())
print(' - {0}:'.format(classifier_new.checkpoint, accuracy_new))