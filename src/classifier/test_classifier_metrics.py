from mentor import Mentor
from metrics import Metrics
from classifier_default import Classifier

def test_answer_confidence(mentor, classifier, question, expected_id=None, min_confidence=None):
    metrics = Metrics()
    answer, answer_id, confidence = metrics.get_answer_confidence(mentor, classifier, question)

    print("test answer confidence for mentor {0}:".format(mentor.id))
    print("'{0}': {2} '{1}'".format(question, answer, confidence))

    if expected_id is not None:
        if expected_id != answer_id:
            print("Assertion Error: expected {0}, got {1}".format(expected_id, answer_id))
        assert expected_id == answer_id
    
    if min_confidence is not None:
        if confidence < min_confidence:
            print("Assertion Error: expected confidence >= {0}, got confidence = {1}".format(min_confidence, confidence))
        assert confidence >= min_confidence

def test_training_accuracy(mentor, classifier, min_accuracy=None):
    metrics = Metrics()
    scores, accuracy = metrics.get_training_accuracy(mentor, classifier)

    print("test training accuracy for mentor {0}:".format(mentor.id))
    print("cross validation score: {0}".format(scores))
    print("accuracy score: {0}".format(accuracy))

    if min_accuracy is not None:
        if accuracy < min_accuracy:
            print("Assertion Error: expected accuracy >= {0}, got accuracy = {1}".format(min_accuracy, accuracy))
        assert accuracy >= min_accuracy


metrics = Metrics()
classifier = Classifier()
clint = Mentor('clint')

test_answer_confidence(clint, classifier, "who are you?")
test_training_accuracy(clint, classifier)
test_answer_confidence(clint, classifier, "who are you?")
