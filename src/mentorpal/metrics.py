import csv
import os

from mentorpal.mentor import Mentor
from mentorpal.utils import sanitize_string

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
    Returns:
        scores: (float array) cross validation scores for training data
        accuracy: (float) accuracy score for training data
    '''
    def train_accuracy(self, classifier):
        scores, accuracy = classifier.train_model()

        return scores, accuracy
    
    '''
    Test classifier and get accuracy score of testing set

    Args:
        classifier: (IClassifier)
        test_file: (string) file name of the testing data to load
    Returns:
        accuracy: (float) accuracy score for training data (correct predictions out of total predictions)
    '''
    def test_accuracy_matrix(self, classifier, test_file, num=None):
        mentor = classifier.mentor
        path = os.path.join("checkpoint","tests",mentor.id,test_file)
        user_questions = self.__read_test_data(path, mentor.question_ids, num)

        print("Loaded test set of {0} questions for {1}".format(len(user_questions), mentor.id))

        correct_predictions = 0
        total_predictions = 0

        for q in user_questions:
            ID, text, confidence = self.answer_confidence(classifier, q)
            if ID in user_questions[q]:
                correct_predictions += 1
            else:
                print("-- '{0}'".format(q))
                print("    Expected {0}".format(user_questions[q]))
                print("    Got {0}".format(ID))
            total_predictions += 1

        return correct_predictions / total_predictions


    def __read_test_data(self, file, question_ids, num):
        # load 2D matrix of user questions vs actual questions
        test_data = list(csv.reader(open(file)))
        numrows = len(test_data)
        numcols = len(test_data[0])

        # number of questions to ask (default is all of them)
        if num is None or num > numcols - 2:
            num = numcols - 2

        # get user questions
        user_questions = {}
        for c in range(0, num):
            user_question = sanitize_string(test_data[0][c + 2])

            # get ideal and reasonable matches for user questions
            for r in range(1, numrows):
                match = sanitize_string(test_data[r][c + 2])
                if match == 'i' or match == 'r':
                    try:
                        ID = question_ids[test_data[r][0]]
                    except KeyError:
                        ID = '_OFF_TOPIC_'
                    try:
                        user_questions[user_question].append(ID)
                    except KeyError:
                        user_questions[user_question] = [ID]

        return user_questions