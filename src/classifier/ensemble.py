import classify
import npceditor_interface
import cPickle
import lstm
import classifier_preprocess
import logisticregression as lr
import sys
from gensim.models.keyedvectors import KeyedVectors
from keras.preprocessing.sequence import pad_sequences
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

    def start_pipeline(self):
        self.classifier.create_data()
        self.classifier.train_lstm()
        self.cl_y_test, self.cl_y_pred=self.classifier.train_lr()

    def get_all_answers(self):
        self.npc.create_full_xml()
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

    def get_answer(self, question):
        classifier_id, classifier_answer=self.classifier.get_answer(question)
        self.npc.create_single_xml(question)
        self.npc.send_request()
        npceditor_id, npceditor_score, npceditor_answer=self.npc.parse_single_xml()

        return_id=None
        return_answer=None
        if npceditor_answer=="answer_none":
            return_id=classifier_id
            return_answer=classifier_answer
        else:
            if float(npceditor_score) < -5.56929:
                return_id=classifier_id
                return_answer=classifier_answer
            else:
                return_id=npceditor_id
                return_answer=npceditor_answer

        return return_id, return_answer


def main():
    ec=EnsembleClassifier()
    question=sys.argv[1]
    train_status=sys.argv[2]
    if train_status=='train':
        ec.start_pipeline()
    answer=ec.get_answer(question)
    return answer

if __name__=='__main__':
    main()

