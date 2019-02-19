from mentorpal.classifier.mentor import Mentor

class Metrics:
    def get_answer_confidence(self, mentor, classifier, question):
        if mentor is None:
            raise Exception('Metrics needs a mentor to get answer confidence from')

        if classifier is None:
            raise Exception('Metrics needs a classifier to get answer confidence from')
        
        classifier.load_model(mentor)
        answer, answer_id, confidence = classifier.get_answer(question)

        return answer, answer_id, confidence

    def get_training_accuracy(self, mentor, classifier):
        if mentor is None:
            raise Exception('Metrics needs a mentor to get training accuracy from')

        if classifier is None:
            raise Exception('Metrics needs a classifier to get training accuracy from')
        
        classifier.load_model(mentor)
        scores, accuracy = classifier.train_model()

        return scores, accuracy
    
    
