import mentor

class IClassifier:
    def __init__(self):
        self.mentor = None

    '''
    Load the data model for a mentor
    '''
    def load_model(self, mentor):
        self.mentor = mentor

    '''
    Train the classifier on the data model for the current mentor
    '''
    def train_model(self):
        if self.mentor is None:
            raise Exception('Classifier needs a mentor data model to train on.')
        pass

    def get_answer_mentor(self, mentor, question):
        if mentor.id is not self.mentor.id:
            load_model(mentor)
            train_model()
        
        return self.get_answer(question)

    def get_answer(self, question):
        return None
