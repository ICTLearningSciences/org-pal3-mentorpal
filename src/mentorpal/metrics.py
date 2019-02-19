import csv
import os

from mentorpal.mentor import Mentor
from mentorpal.utils import SanitizeString

class Metrics:

    '''
    Get answer and answer confidence

    Args:
        classifier: (IClassifier)
        question: (str) the question text
    Returns:
        answer_id: (str) the id for the answer (typically from a predetermined set)
        answer_text: (str) the text of the answer
        confidence: (float) 0.0-1.0 confidence score for the question-answer mapping
    '''
    def answer_confidence(self, classifier, question):
        answer_id, answer, confidence = classifier.get_answer(question)

        return answer_id, answer, confidence


    '''
    Train classifier and get accuracy score of training

    Args:
        classifier: (IClassifier)
        train_file: (string) file name of the training data to load
    Returns:
        scores: (float array) cross validation scores for training data
        accuracy: (float) accuracy score for training data
    '''
    def training_accuracy(self, classifier, train_file):
        scores, accuracy = classifier.train_model(train_file)

        return scores, accuracy
    

    '''
    Test classifier and get accuracy score of testing set

    Args:
        classifier: (IClassifier)
        test_file: (string) file name of the testing data to load
    Returns:
        accuracy: (float) accuracy score for training data (correct predictions out of total predictions)
        size: (int) number of user questions in test set
    '''
    def testing_accuracy(self, classifier, test_file):
        mentor = classifier.mentor
        path = os.path.join("mentors", mentor.id, "data", test_file)
        test_data, user_questions = self.read_test_data(path, mentor.question_ids)

        correct_predictions = 0
        total_predictions = 0

        for q in user_questions:
            ID, text, confidence = self.answer_confidence(classifier, q)
            if ID in user_questions[q]:
                correct_predictions += 1
            total_predictions += 1

        return correct_predictions / total_predictions, total_predictions


    def read_test_data(self, file, question_ids):
        # load 2D matrix of user questions vs actual questions
        test_data = list(csv.reader(open(file)))
        numrows = len(test_data)
        numcols = len(test_data[0])

        # get user questions
        user_questions = {}
        for c in range(2, numcols):
            userq = SanitizeString(test_data[0][c])

            # get ideal and reasonable matches for user questions
            for r in range(1, numrows):
                q = SanitizeString(test_data[r][0])
                match = SanitizeString(test_data[r][c])

                try:
                    ID = question_ids[test_data[r][0]]
                except KeyError:
                    ID = '_OFF_TOPIC_'

                if match == 'i' or match == 'r':
                    try:
                        user_questions[userq].append(ID)
                    except KeyError:
                        user_questions[userq] = [ID]
        
        return test_data, user_questions