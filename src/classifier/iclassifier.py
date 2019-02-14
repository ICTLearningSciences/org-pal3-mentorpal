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

    '''
    Get an answer, answer id, and answer confidence for the given question and current mentor
    '''
    def get_answer(self, question):
        return "none", "none", 0.0
