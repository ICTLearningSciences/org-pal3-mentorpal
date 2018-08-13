import os
import csv

class Logger(object):
    'New Class with static methods to log data through Python, specifically for the web version'
    def __init__(self):
        print("Logger")
    @staticmethod
    def logUserID(ID):
        with open('QuestionAnswerLog.csv', 'a', newline='') as log:
            logWriter = csv.writer(log, delimiter=' ', quotechar='|', quoting=csv.QUOTE_MINIMAL, lineterminator=",") #this keeps the rest open for

    @staticmethod
    def logData(mentor, question, answerNPC, answerClassifier, finalAnswer, videoID, npcConfidence, classifierConfidence):
        print(mentor)
        with open('QuestionAnswerLog.csv', 'a', newline='') as log:
            logWriter = csv.writer(log, delimiter=',', quotechar='"')
            logWriter.writerow([mentor.id, question, answerNPC, answerClassifier, finalAnswer, videoID, npcConfidence, classifierConfidence])
