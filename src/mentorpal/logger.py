import os
import csv
from datetime import datetime
class Logger(object):
    'New Class with static methods to log data through Python, specifically for the web version'
    def __init__(self):
        print("Logger")
    @staticmethod
    def logUserID(ID, uID):
        if not os.path.isfile('QuestionAnswerLog.csv'):
            with open('QuestionAnswerLog.csv', 'a', newline='') as log:
                logWriter = csv.writer(log, delimiter=',', quotechar='"')
                logWriter.writerow(["UserID", "SessionID", "MentorID", "Question", "NPC Answer", "Classifier Answer", "Final Chosen Answer", "Final Video ID", "NPC Editor Confidence", "Classifier Confidence", "Time"])
        with open('QuestionAnswerLog.csv', 'a', newline='') as log:
            logWriter = csv.writer(log, delimiter=',', quotechar='|', quoting=csv.QUOTE_MINIMAL, lineterminator=",") #this keeps the rest open for
            logWriter.writerow([ID, uID])
    @staticmethod
    def logData(mentor, question, answerNPC, answerClassifier, finalAnswer, videoID, npcConfidence, classifierConfidence):
        with open('QuestionAnswerLog.csv', 'a', newline='') as log:
            logWriter = csv.writer(log, delimiter=',', quotechar='"')
            logWriter.writerow([mentor.id, question, answerNPC, answerClassifier, finalAnswer, videoID, npcConfidence, classifierConfidence, datetime.now()])
