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
    Return the cross validation score and accuracy score
    '''
    def train_model(self):
        if self.mentor is None:
            raise Exception('Classifier needs a mentor data model to train on.')
        
        return [], 0.0

    '''
    Get an answer, answer id, and answer confidence for the given question and current mentor
    '''
    def get_answer(self, question):
        return "none", "none", 0.0
