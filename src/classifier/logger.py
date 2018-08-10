import csv

class Logger(object):
    'New Class with static methods to log data through Python, specifically for the web version'
    def __init__(self):

    @staticmethod
    def logUserID(ID, interface):
        with open('QuestionAnswerLog.csv', 'w') as log:
            
    @staticmethod
    def logData(Mentor, question, answerNPC, answerClassifier, npcConfidence, classifierConfidence):
        with open('QuestionAnswerLog.csv', 'w') as log:
