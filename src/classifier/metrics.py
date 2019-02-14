from mentor import Mentor

class Metrics:
    def get_answer_confidence(self, mentor, classifier, question):
        if mentor is None:
            raise Exception('Metrics needs a mentor to get answer confidence from')

        if classifier is None:
            raise Exception('Metrics needs a classifier to get answer confidence from')
        
        classifier.load_model(mentor)
        answer, answer_id, confidence = classifier.get_answer(question)

        return answer, answer_id, confidence

    def get_accuracy_score(self, mentor, classifier, test_data):
        pass
