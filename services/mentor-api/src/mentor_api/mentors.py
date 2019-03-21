from mentorpal.classifier_lstm_v1 import LSTMClassifier

mentor_classifiers_by_id = dict()

def find_mentor_classifier(mentor_id):
    mc = mentor_classifiers_by_id.get(mentor_id)

    if mc is None:
        mc = LSTMClassifier(mentor_id)
        mentor_classifiers_by_id[mentor_id] = mc

    return mc