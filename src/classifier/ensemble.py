import classify
import npceditor_interface
import pickle
import lstm
import classifier_preprocess
import logisticregression as lr
import pandas as pd
import sys
import os
import json
import random
from gensim.models.keyedvectors import KeyedVectors
from keras.preprocessing.sequence import pad_sequences
from sklearn.metrics import f1_score, accuracy_score

class EnsembleClassifier(object):
    def __init__(self):
        self.test_data=None
        self.x_test=None
        self.y_test=None
        self.cl_y_test=[]
        self.cl_y_pred=[]
        self.npc_y_test=[]
        self.npc_y_pred=[]
        self.ensemble_pred=[]
        self.session_started=False
        self.session_ended=False
        self.classifier=classify.Classify()
        self.npc=npceditor_interface.NPCEditor()
        self.utterance_df=pd.read_csv(open(os.path.join("data","utterance_data.csv"),'rb'))
        #variables to keep track of session
        self.blacklist=set()
        self.pal3_status_codes={'_START_SESSION_', '_INTRO_', '_IDLE_', '_TIME_OUT_', '_END_SESSION_'} #status codes that PAL3 sends to code
        self.utterances_prompts={} #responses for the special cases
        
        for i in range(len(self.utterance_df)):
            situation=self.utterance_df.iloc[i]['situation']
            video_name=self.utterance_df.iloc[i]['ID']
            utterance=self.utterance_df.iloc[i]['utterance']
            if situation in self.utterances_prompts:
                self.utterances_prompts[situation].append((video_name, utterance))
            else:
                self.utterances_prompts[situation]=[(video_name, utterance)]

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
        self.classifier.create_data(mode=mode)
        #Classifier is trained with and without topic vectors to provie flexibility
        self.classifier.train_lstm()
        self.classifier.train_classifier()
        if mode=='train_test_mode':
            self.test_data=json.load(open(os.path.join("test_data","lr_test_data.json"),'r'))
            self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))]
            self.y_test=[self.test_data[i][3] for i in range(len(self.test_data))]
            self.cl_y_test, self.cl_y_pred=self.classifier.test_classifier(use_topic_vectors=use_topic_vectors)
            self.npc.load_test_data()
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

        print("Accuracy: "+str(accuracy_score(self.y_test, self.ensemble_pred)))
        print("F-1: "+str(f1_score(self.y_test, self.ensemble_pred, average='micro')))

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
            print("Answer from classifier chosen")
        else:
            if float(npceditor_score) < -5.56929:
                return_id=classifier_id
                return_answer=classifier_answer
                print("Answer from classifier chosen")
            else:
                return_id=npceditor_id
                return_answer=npceditor_answer
                print("Answer from NPCEditor chosen")
        #check if already answered.
        #If so, fetch different answer or throw appropriate prompt
        self.blacklist.add(return_id)
        return return_id, return_answer
    
    '''
    Checks if the question is off-topic. This function is not completed yet.
    '''
    def is_off_topic(self, question):
        return False


    #information to track must be discussed with Ben, Nick, Kayla
    def start_session(self):
        print("Session started")
        #handle variables to track session
        self.session_started=True
        self.session_ended=False
        
    #play intro clip
    def play_intro(self):
        return self.utterances_prompts['_INTRO_'][0]

    #play idle clip
    def play_idle(self):
        print("Idle")
        return ('no_video_yet', '_EMPTY_TEXT_')
        
    def end_session(self):
        print("Session ended")
        #handle variables to end session
        self.session_ended=True
        self.blacklist.clear()

    '''
    This method checks the status of the question: whether it is an off-topic or a repeat. Other statuses can be added here.
    '''
    def check_question(self, question):
        #if question is a special case - HANDLE SHOW IDLE CASE
        if question in self.pal3_status_codes:
            return question

        #if question is off-topic
        if self.is_off_topic(question):
            return '_OFF_TOPIC_'

        #if question is repeat
        if question in self.blacklist:
            return '_REPEAT_'
        else:
            return '_NEW_QUESTION_'

    '''
    This method returns the appropriate prompt for a particular question status
    '''
    def return_prompt(self, question_status):
        # Select a prompt and return it
        if question_status=="_START_SESSION_":
            self.start_session()
            return ('no_video', '_START_')

        elif question_status=="_END_SESSION_":
            self.end_session()
            return ('no_video', '_END_')

        elif question_status=="_INTRO_":
            return self.play_intro()

        elif question_status=="_IDLE_":
            return self.play_idle()

        elif question_status=="_TIME_OUT_":
            #load a random prompt from file and return it.
            #The choice of prompt can also be based on the topic of the last asked question
            #This will help drive the conversation in the direction we want so that an agenda can be maintained
            len_timeouts=len(self.utterances_prompts['_PROMPT_'])
            index=random.randint(0,len_timeouts-1)
            return self.utterances_prompts['_PROMPT_'][index]

        elif question_status=="_OFF_TOPIC_":
            #load off-topic feedback clip and play it
            len_offtopic=len(self.utterances_prompts['_OFF_TOPIC_'])
            index=random.randint(0,len_offtopic-1)
            return self.utterances_prompts['_OFF_TOPIC_'][index]

        elif question_status=="_REPEAT_":
            #load repeat feedback clip and play it
            len_repeat=len(self.utterances_prompts['_REPEAT_'])
            index=random.randint(0,len_repeat-1)
            return self.utterances_prompts['_REPEAT_'][index]

    '''
    When you want to get an answer to a question, this method will be used. Flexibility to use/not use topic vectors is provided.
    For special cases like time-out, user diverting away from topic, etc., pass a pre-defined message as the question.
    check_question(question) will handle the pre-defined message and an appropriate prompt will be returned.
    For example, when PAL3 times out, a message like "PAL3 has timed out due to no response from user" will be sent as the question.
    self.special_cases will have this message stored already and a question_status will be linked to it like:
    "PAL3 has timed out due to no response from user": "pal3_timeout". This question status will trigger an appropriate prompt
    from return_prompt
    '''
    def process_input_from_ui(self, question, use_topic_vectors=True):
        question_status=self.check_question(question) #check the question status
        #if the question is legitimate, then fetch answer
        if question_status=='_NEW_QUESTION_':
            if not self.session_started:
                self.return_prompt('_START_SESSION_')
            answer=self.get_one_answer(question, use_topic_vectors=use_topic_vectors)

        #Statuses that require a prompt from the mentor
        else:
            answer=self.return_prompt(question_status)

        # answer=self.get_one_answer(question, use_topic_vectors=use_topic_vectors)
        return answer



