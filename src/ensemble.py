import classify
import npceditor_interface
import cPickle
from sklearn.metrics import f1_score, accuracy_score

class EnsembleClassifier(object):
    def __init__(self):
        self.test_data=cPickle.load(open('test_data/lr_test_data.pkl','rb'))
        self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))]
        self.y_test=[self.test_data[i][3] for i in range(len(self.test_data))]
        self.cl_y_test=[]
        self.cl_y_pred=[]
        self.npc_y_test=[]
        self.npc_y_pred=[]
        self.ensemble_pred=[]
        self.classifier=classify.Classify()
        self.npc=npceditor_interface.NPCEditor()
    
    def ensemble(self):
        self.classifier.create_data()
        self.classifier.train_lstm()
        self.cl_y_test, self.cl_y_pred=self.classifier.train_lr()
        self.npc.create_xml()
        self.npc.send_request()
        self.npc_y_test, self.npc_y_pred=self.npc.parse_xml()
        
        for i in range(0,len(self.cl_y_pred)):
            if self.npc_y_pred[i][1]=="answer_none":
                self.ensemble_pred.append(self.cl_y_pred[i])
            else:
                if float(self.npc_y_pred[i][0]) < -5.56929:
                    self.ensemble_pred.append(self.cl_y_pred[i])
                else:
                    self.ensemble_pred.append(self.npc_y_pred[i][1])

        print "Accuracy: "+str(accuracy_score(self.y_test, self.ensemble_pred))
        print "F-1: "+str(f1_score(self.y_test, self.ensemble_pred, average='micro'))


def main():
    ec=EnsembleClassifier()
    ec.ensemble()

if __name__=='__main__':
    main()

