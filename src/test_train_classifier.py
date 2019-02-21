from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.classifier_train_lstm_v1 import TrainLSTMClassifier

def test_answer_confidence(classifier, question, expected_id=None, min_confidence=None):
    print("\nTEST ANSWER CONFIDENCE: {0}".format(classifier.mentor.id))
    print("question: " + question)

    metrics = Metrics()
    answer_id, answer, confidence = metrics.answer_confidence(classifier, question)

    print("answer: {0}".format(answer))
    print("id: {0}".format(answer_id))
    print("confidence: {0}".format(confidence))

    if expected_id is not None:
        print("expected answer id={0}, got {1}".format(expected_id, answer_id))
        assert expected_id == answer_id
    
    if min_confidence is not None:
        print("expected confidence>={0}, got {1}".format(min_confidence, confidence))
        assert confidence >= min_confidence

def test_training_accuracy(classifier, min_accuracy=None):
    print("\nTEST TRAINING ACCURACY: {0}".format(classifier.mentor.id))

    metrics = Metrics()
    scores, accuracy = metrics.training_accuracy(classifier)

    print("cross validation score: {0}".format(scores))
    print("accuracy score: {0}".format(accuracy))

    if min_accuracy is not None:
        print("expected accuracy>={0}, got {1}".format(min_accuracy, accuracy))
        assert accuracy >= min_accuracy

def test_testing_accuracy(classifier, test_data, min_accuracy=None):
    print("\nTEST TESTING ACCURACY: {0}".format(classifier.mentor.id))
    print("testing set: {0}".format(test_data))
    
    metrics = Metrics()
    accuracy, size = metrics.testing_accuracy(classifier, test_data)

    print("questions asked: {0}".format(size))
    print("accuracy score: {0}".format(accuracy))

    if min_accuracy is not None:
        print("expected accuracy>={0}, got {1}".format(min_accuracy, accuracy))
        assert accuracy >= min_accuracy

metrics = Metrics()

# clint = TrainLSTMClassifier('clint')
julianne = TrainLSTMClassifier('julianne')
# dan = TrainLSTMClassifier('dan')
# carlos = TrainLSTMClassifier('carlos')

# test_training_accuracy(clint)
test_training_accuracy(julianne)
# test_training_accuracy(dan)
# test_training_accuracy(carlos)

# test_answer_confidence(clint,  "why did you join the navy?", 'clintanderson_A131_3_1')
test_answer_confidence(julianne,  "why did you join the navy?", 'julianne_A9_1_3')
# test_answer_confidence(dan,  "why did you join the navy?")
# test_answer_confidence(carlos,  "why did you join the navy?", 'carlos_A55_2_1')

# test_testing_accuracy(clint, 'testing_data_sparse.csv', 0.5)