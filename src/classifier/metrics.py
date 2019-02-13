from mentor import Mentor

class Metrics:
    def get_answer_confidence(self, classifier, question):
        if classifier is None:
            raise Exception('Metrics needs a classifier to get answer confidence from')
        
        clint = Mentor('clint')
        classifier.load_model(clint)
        answer, confidence = classifier.get_answer(question)

        print('question: ' + str(question))
        print('answer: ' + str(answer))
        print('confidence: ' + str(confidence))

        return answer, confidence

    def get_accuracy_score(self, classifier, test_data):
        pass
    
    
