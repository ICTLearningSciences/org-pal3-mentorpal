from mentor import Mentor
from metrics import Metrics
from classifier_default import Classifier

def test_answer_confidence(mentor, classifier, question, expected_id=None, min_confidence=None):
    metrics = Metrics()
    answer, answer_id, confidence = metrics.get_answer_confidence(mentor, classifier, question)
    print("'{0}': {2} '{1}'".format(question, answer, confidence))

    if expected_id is not None:
        if expected_id != answer_id:
            print("Assertion Error: expected {0}, got {1}".format(expected_id, answer_id))
        assert expected_id == answer_id
    
    if min_confidence is not None:
        if confidence < min_confidence:
            print("Assertion Error: expected confidence >= {0}, got confidence = {1}".format(min_confidence, confidence))
        assert confidence >= min_confidence

def test_cross_validation_score(classifier):
    metrics = Metrics()
    pass

def test_accuracy_score(classifier, min_score=None):
    metrics = Metrics()
    pass

metrics = Metrics()
classifier = Classifier()
clint = Mentor('clint')

test_answer_confidence(clint, classifier, "who are you?")