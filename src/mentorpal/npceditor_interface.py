import xml.etree.cElementTree as ET
import os
import numpy as np
import json
import sys
import time
from sklearn.metrics import f1_score, accuracy_score

from mentorpal import mentor
from mentorpal import vhmsg

class NPCEditor(object):
    def __init__(self):
        self.requests=ET.Element('requests', ID='L1', agentName='clintanderson')
        self.response=""
        self.y_pred=[]
        self.test_data=None
        self.x_test=None
        self.y_test=None
        self.test_questions=None
        self.train_questions=[]
        self.answered_question=False
        self.turn_id = 0
        self.vhmsg = vhmsg.VHMSG()
        self.vhmsg.openConnection()
        self.vhmsg.subscribe("vrExpress", self.vhmsg_callback)
        self.mentor=None

    def set_mentor(self, mentor):
        self.mentor=mentor
        
    def load_test_data(self):
        self.test_data=json.load(open(os.path.join("mentors",self.mentor.id,"test_data","lr_test_data.json"),'r'))
        self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))]
        self.y_test=[self.test_data[i][3] for i in range(len(self.test_data))]
        [self.test_data[i][0] for i in range(len(self.test_data))]

    def PrintResult(self, result):
        print("SUCCESS" if result==0 else "FAILURE")

    def vhmsg_callback(self, firstWord, body):
        splitMsg = body.split(' ')
        if splitMsg[0] == 'Clint':
            self.vhmsg.sendMessage('vrAgentBML', 'test {0} end complete'.format(splitMsg[2]))
            self.response=' '.join(splitMsg[3:])
            self.answered_question=True
            self.turn_id = self.turn_id + 1

    def close_npceditor(self, id):
        self.vhmsg.sendMessage('NPCEditor', '<script target="{0}">theDocument.close()</script>'.format(id))

    def close_vhmsg(self):
        self.vhmsg.closeConnection()
        
    '''
    Send an xml file as a request to NPCEditor.
    '''
    def send_request(self, question):
        self.vhmsg.sendMessage('vrSpeech', 'start test{0} {1}'.format(self.turn_id, self.mentor.id))
        self.vhmsg.sendMessage('vrSpeech', 'finished-speaking test{0} {1}'.format(self.turn_id, self.mentor.id))
        self.vhmsg.sendMessage('vrSpeech', 'interp test{0} 0 1.0 normal {1}'.format(self.turn_id, question))
        self.vhmsg.sendMessage('vrSpeech', 'asr-complete test{0}'.format(self.turn_id))

        update_interval=0.1
        while not self.answered_question:
            time.sleep(update_interval)
        self.answered_question=False
        
    '''
    Parse the xml file that is returned when the big xml file with a set of questions is sent to NPCEditor.
    This method is used only when testing the performance of the system.
    '''
    def parse_full_xml(self):
        responses=json.loads(self.response)
        for response in responses['responses']:
            try:
                score=response['score']
                id=response['ID']
                answer=response['text']
                self.y_pred.append((score, id))
            except:
                self.y_pred.append((-100.0,"answer_none"))
        preds=[item[1] for item in self.y_pred]
        print("Accuracy: "+str(accuracy_score(self.y_test, preds)))
        print("F-1: "+str(f1_score(self.y_test, preds, average='micro')))
        return self.y_test, self.y_pred

    '''
    Parse the xml file that is returned when the xml file with a single question is sent to NPCEditor.
    This method is used whenever the user asks a new question. This method returns the answer to the ensemble classifier.
    '''
    def parse_single_xml(self):
        responses = json.loads(self.response)
        answer="answer_none"
        id=None
        score=-100.0
        for response in responses['responses']:
            if score < response['score']:
                score=response['score']
                id=response['ID']
                answer=response['text']
        return id, score, answer, responses['responses']