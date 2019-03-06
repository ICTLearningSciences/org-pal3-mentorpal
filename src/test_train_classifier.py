from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.classifier_train_lstm_v1 import TrainLSTMClassifier

def test_answer_confidence(classifier, question, expected_id=None, min_confidence=None):
    print("\nANSWER CONFIDENCE: {0} '{1}'".format(classifier.mentor.id, question))

    metrics = Metrics()
    answer_id, answer, confidence = metrics.answer_confidence(classifier, question)

    print("-- id: {0}".format(answer_id))
    print("-- answer: {0}".format(answer))
    print("-- confidence: {0}".format(confidence))

    if expected_id is not None:
        print("expected answer id={0}, got {1}".format(expected_id, answer_id))
        assert expected_id == answer_id
    
    if min_confidence is not None:
        print("expected confidence>={0}, got {1}".format(min_confidence, confidence))
        assert confidence >= min_confidence

def test_training_accuracy(classifier, min_accuracy=None):
    print("\nTRAINING ACCURACY: {0}".format(classifier.mentor.id))

    metrics = Metrics()
    scores, accuracy = metrics.train_accuracy(classifier)

    print("cross validation score: {0}".format(scores))
    print("accuracy score: {0}".format(accuracy))

    if min_accuracy is not None:
        print("expected accuracy>={0}, got {1}".format(min_accuracy, accuracy))
        assert accuracy >= min_accuracy

def test_testing_accuracy(classifier, test_data, num_questions=None, min_accuracy=None):
    print("\nTESTING ACCURACY: {0}".format(classifier.mentor.id))
    
    metrics = Metrics()
    accuracy = metrics.test_accuracy(classifier, test_data, num_questions)

    if min_accuracy is not None:
        print("expected accuracy>={0}, got {1}".format(min_accuracy, accuracy))
        assert accuracy >= min_accuracy

metrics = Metrics()
clint = TrainLSTMClassifier('clint')
test_answer_confidence(clint, "why did you join the navy?", 'clintanderson_A131_3_1')
# test_testing_accuracy(clint, 'testing_data_sparse.csv', None, 0.5)
test_testing_accuracy(clint, 'testing_data_full.csv')