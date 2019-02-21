from mentorpal.mentor import Mentor
from mentorpal.metrics import Metrics
from mentorpal.train_classifier import TrainClassifier

def test_answer_confidence(classifier, question, expected_id=None, min_confidence=None):
    print("\nTEST ANSWER CONFIDENCE: {0}".format(classifier.mentor.id))
    print("question: " + question)

    metrics = Metrics()
    answer_id, answer, confidence = metrics.answer_confidence(classifier, question)

    print("answer: {0}".format(answer))
    print("id: {0}".format(answer_id))
    print("confidence: {0}".format(confidence))

    if expected_id is not None:
        print("Assertion: expected answer id={0}, got {1}".format(expected_id, answer_id))
        assert expected_id == answer_id
    
    if min_confidence is not None:
        print("Assertion: expected confidence>={0}, got {1}".format(min_confidence, confidence))
        assert confidence >= min_confidence

def test_training_accuracy(classifier, train_data=None, min_accuracy=None):
    print("\nTEST TRAINING ACCURACY: {0}".format(classifier.mentor.id))
    if train_data is None:
        train_data = 'training_data.csv'
        print("No training data file specified, using default: {0}".format(train_data))
    else:
        print("training set: {0}".format(train_data))

    metrics = Metrics()
    scores, accuracy = metrics.training_accuracy(classifier, train_data)

    print("cross validation score: {0}".format(scores))
    print("accuracy score: {0}".format(accuracy))

    if min_accuracy is not None:
        print("Assertion: expected accuracy>={0}, got {1}".format(min_accuracy, accuracy))
        assert accuracy >= min_accuracy

def test_testing_accuracy(classifier, test_data=None, min_accuracy=None):
    print("\nTEST TESTING ACCURACY: {0}".format(classifier.mentor.id))
    if test_data is None:
        test_data = 'testing_data.csv'
        print("No testing data file specified, using default: {0}".format(test_data))
    else:
        print("testing set: {0}".format(test_data))
    
    metrics = Metrics()
    accuracy, size = metrics.testing_accuracy(classifier, test_data)

    print("questions asked: {0}".format(size))
    print("accuracy score: {0}".format(accuracy))

    if min_accuracy is not None:
        print("Assertion: expected accuracy>={0}, got {1}".format(min_accuracy, accuracy))
        assert accuracy >= min_accuracy

metrics = Metrics()

clint = TrainClassifier('clint')
# julianne = TrainClassifier('julianne')
# dan = TrainClassifier('dan')
# carlos = TrainClassifier('carlos')

test_training_accuracy(clint, None, 0.3)
# test_training_accuracy(julianne, 0.4)
# test_training_accuracy(dan, 0.3)
# test_training_accuracy(carlos, 0.4)

test_answer_confidence(clint,  "why did you join the navy?", 'clintanderson_A131_3_1')
# test_answer_confidence(julianne,  "why did you join the navy?", 'julianne_A9_1_3')
# test_answer_confidence(dan,  "why did you join the navy?")
# test_answer_confidence(carlos,  "why did you join the navy?", 'carlos_A55_2_1')

test_testing_accuracy(clint, 'testing_data_sparse.csv', 0.5)