
import datetime

'''
Trains and saves model to a new checkpoint for the given IClassifier
IClassifier type must implement a train_model method

Args:
    Classifier: IClassifier
        classifier to train and checkpoint
Returns:
    checkpoint: string
        name of checkpoint

'''
def create_checkpoint(classifier):
    date = datetime.datetime.now()
    checkpoint = date.strftime('%Y-%m-%d-%H%M')

    classifier.__init__('clint', checkpoint)
    classifier.train_model()

    classifier.__init__('dan', checkpoint)
    classifier.train_model()

    classifier.__init__('carlos', checkpoint)
    classifier.train_model()

    classifier.__init__('julianne', checkpoint)
    classifier.train_model()

    return checkpoint