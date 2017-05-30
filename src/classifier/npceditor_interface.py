import xml.etree.cElementTree as ET
import os
import pickle
import numpy as np
from subprocess import Popen, PIPE
from sklearn.metrics import f1_score, accuracy_score
class NPCEditor(object):
    def __init__(self):
        self.requests=ET.Element('requests', ID='L1', agentName='Clint')
        self.response=""
        self.y_pred=[]
        self.test_data=pickle.load(open('test_data/lr_test_data.pkl','rb'))
        self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))]
        self.y_test=[self.test_data[i][3] for i in range(len(self.test_data))]
        self.test_questions=[self.test_data[i][0] for i in range(len(self.test_data))]
        self.train_questions=[]

    '''
    This method is used to create xml file for a set of questions. This is used only when testing out the classifier with the 
    entire test set. This big xml file is sent to NPCEditor.
    '''
    def create_full_xml(self):
        i=0
        for question in self.test_questions:
            request=ET.SubElement(self.requests,'request', target="All", ID="question_"+str(i), source="Anybody")
            ET.SubElement(request, "field", name="text").text = question
            i+=1
            #self.train_questions.append("question_"+str(i))
        tree=ET.ElementTree(self.requests)
        tree.write('xml_messages/npceditor_request.xml')
    
    '''
    When a question is asked, this method creates an xml file for that one question only. This xml is sent to NPCEditor.
    '''
    def create_single_xml(self, question):
        request=ET.SubElement(self.requests,'request', target="All", ID="question_1", source="Anybody")
        ET.SubElement(request, "field", name="text").text = question
        tree=ET.ElementTree(self.requests)
        tree.write('xml_messages/npceditor_request.xml')      

    '''
    Send an xml file as a request to NPCEditor.
    '''
    def send_request(self):
        cmd=Popen(['java', '-cp', '/Applications/NPCEditor.app/npceditor.jar:/Applications/NPCEditor.app/plugins/batch_plugin.jar','edu.usc.ict.npc.server.net.ipc.BatchModule','--stdin', 'xml_messages/npceditor_request.xml'], stdout=PIPE)
        cmd_out, cmd_err=cmd.communicate()        
        output=cmd_out.split('\n')
        self.response=output[-2][55:]

    '''
    Parse the xml file that is returned when the big xml file with a set of questions is sent to NPCEditor.
    This method is used only when testing the performance of the system.
    '''
    def parse_full_xml(self):
        responses=ET.fromstring(self.response)
        for response in responses:
            for answer in response:
                try:
                    score=answer[0].attrib['score']
                    id=answer[0][0].text
                    ans=answer[0][1].text
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
        responses=ET.fromstring(self.response)
        answer=""
        id=None
        score=-100.0
        for response in responses:
            for answer in response:
                try:
                    score=answer[0].attrib['score']
                    id=answer[0][0].text
                    answer=answer[0][1].text
                except:
                    answer="answer_none"
        return id, score, answer