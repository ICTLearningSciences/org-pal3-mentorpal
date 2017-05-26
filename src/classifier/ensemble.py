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

        #variables to keep track of session
        self.blacklist=set()
        self.special_cases={} #"PAL3 has timed out due to no response from user": "pal3_timeout" and such cases

    '''
    This starts the pipeline for training the classifier from scratch.
    When new data is available and a new model needs to be built, calling this function will generate a new classifier.
    When you want to evaluate performance, send method='train_test_mode' to get performance metrics.
    When you want to just train the classifier, the default option mode='train_mode' will be activated. No explicit passing reqd.
    
    Every time, two versions of the classifier are created: one with the topic vectors and one without topic vectors.
    This is done so that in the future, if either model needs to be used to get answers to questions, passing use_topic_vectors=True
    or False will enable to use/not use topic vectors.
    '''
    def start_pipeline(self, mode='train_mode', use_topic_vectors='True'):
        self.classifier.create_data()
        #Classifier is trained with and without topic vectors to provie flexibility
        self.classifier.train_lstm()
        self.classifier.train_classifier()
        if mode=='train_test_mode':
            self.cl_y_test, self.cl_y_pred=self.classifier.test_classifier(use_topic_vectors=use_topic_vectors)
            self.get_all_answers()

    '''
    Get answers for all the questions. Used when building a new classifier model. Will be called automatically as part of the 
    start_pipeline method.
    '''
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

    '''
    When only one answer is required for a single question, use this method. You can choose to use or not use the topic vectors by
    passing the named parameter as True or False.
    '''
    def get_one_answer(self, question, use_topic_vectors=True):
        classifier_id, classifier_answer=self.classifier.get_answer(question, use_topic_vectors=use_topic_vectors)
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
        #check if already answered.
        #If so, fetch different answer or throw appropriate prompt
        self.blacklist.add(return_id)
        return return_id, return_answer
    
    '''
    Checks if the question is off-topic
    '''
    def is_off_topic(self, question):


    '''
    This method checks the status of the question: whether it is an off-topic or a repeat. Other statuses can be added here.
    '''
    def check_question(self, question):
        #if question is a special case
        if question in self.special_cases:
            for case, question_status in self.special_cases.iteritems():
                if question == case:
                    return question_status

        #if question is off-topic
        if self.is_off_topic(question):
            return 'off-topic'

        #if question is repeat
        if question in self.blacklist:
            return 'repeat'
        else:
            return 'new-question'

    '''
    This method returns the appropriate prompt for a particular question status
    '''
    def return_prompt(self, situation):
        #Load the prompts file

        #Select a prompt and return it

    '''
    When you want to get an answer to a question, this method will be used. Flexibility to use/not use topic vectors is provided.
    For special cases like time-out, user diverting away from topic, etc., pass a pre-defined message as the question.
    check_question(question) will handle the pre-defined message and an appropriate prompt will be returned.
    For example, when PAL3 times out, a message like "PAL3 has timed out due to no response from user" will be sent as the question.
    self.special_cases will have this message stored already and a question_status will be linked to it like:
    "PAL3 has timed out due to no response from user": "pal3_timeout". This question status will trigger an appropriate prompt
    from return_prompt
    '''
    def answer_the_question(self, question, use_topic_vectors=True):
        question_status=check_question(question) #check the question status

        #if the question is legitimate, then fetch answer
        if question_status=='new-question':
            answer=self.get_one_answer(question, use_topic_vectors=use_topic_vectors)

        #Statuses that require a prompt from the mentor
        else:
            answer=self.return_prompt(self, question_status)

        return answer

    #information to track must be discussed with Ben, Nick, Kayla
    def start_session(self):
        self.blacklist.clear()
        #set other variables to track session

    def end_session(self):
        #handle variables to end session
            

