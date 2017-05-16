import xml.etree.cElementTree as ET
import os
import cPickle
import numpy as np
from subprocess import Popen, PIPE
from sklearn.metrics import f1_score, accuracy_score
class NPCEditor(object):
    def __init__(self):
        self.requests=ET.Element('requests', ID='L1', agentName='Clint')
        self.response=""
        self.y_pred=[]
        self.test_data=cPickle.load(open('test_data/lr_test_data.pkl','rb'))
        self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))]
        self.y_test=[self.test_data[i][3] for i in range(len(self.test_data))]
        self.test_questions=[self.test_data[i][0] for i in range(len(self.test_data))]
        self.train_questions=[]

    def create_full_xml(self):
        i=0
        for question in self.test_questions:
            request=ET.SubElement(self.requests,'request', target="All", ID="question_"+str(i), source="Anybody")
            ET.SubElement(request, "field", name="text").text = question
            i+=1
            #self.train_questions.append("question_"+str(i))
        tree=ET.ElementTree(self.requests)
        tree.write('xml_messages/npceditor_request.xml')
    
    def create_single_xml(self, question):
        request=ET.SubElement(self.requests,'request', target="All", ID="question_1", source="Anybody")
        ET.SubElement(request, "field", name="text").text = question
        tree=ET.ElementTree(self.requests)
        tree.write('xml_messages/npceditor_request.xml')      

    def send_request(self):
        cmd=Popen(['java', '-cp', '/Applications/NPCEditor.app/npceditor.jar:/Applications/NPCEditor.app/plugins/batch_plugin.jar','edu.usc.ict.npc.server.net.ipc.BatchModule','--stdin', 'xml_messages/npceditor_request.xml'], stdout=PIPE)
        cmd_out, cmd_err=cmd.communicate()        
        output=cmd_out.split('\n')
        self.response=output[-2][55:]

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
        print "Accuracy: "+str(accuracy_score(self.y_test, preds))
        print "F-1: "+str(f1_score(self.y_test, preds, average='micro'))
        return self.y_test, self.y_pred

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