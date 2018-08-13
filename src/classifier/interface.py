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
import csv
import datetime
import time
import mentor
from logger import Logger
from gensim.models.keyedvectors import KeyedVectors
from keras.preprocessing.sequence import pad_sequences
from sklearn.metrics import f1_score, accuracy_score

class BackendInterface(object):
    num_blacklisted_repeats = 5

    def __init__(self, mode='ensemble'):
        self.pal3_status_codes={'_START_SESSION_', '_INTRO_', '_IDLE_', '_TIME_OUT_', '_END_SESSION_', '_EMPTY_'} #status codes that PAL3 sends to code
        self.test_data=None
        self.x_test=None
        self.y_test=None
        self.mode=mode
        self.cl_y_test_unfused=[]
        self.cl_y_pred_nufused=[]
        self.cl_y_test_fused=[]
        self.cl_y_pred_fused=[]
        self.npc_y_test=[]
        self.npc_y_pred=[]
        self.ensemble_pred=[]
        self.cpp=classifier_preprocess.ClassifierPreProcess()
        self.tpp=classifier_preprocess.NLTKPreprocessor()
        if self.mode=='ensemble' or self.mode=='classifier':
            self.classifier=classify.Classify()
        if self.mode=='ensemble' or self.mode=='npceditor':
            self.npc=npceditor_interface.NPCEditor()
        self.mentorsById={}
        #variables to keep track of session
        self.mentor=None
        self.session_started=False
        self.use_repeats=False
        self.should_bump=False
        self.blacklist=list()
        self.last_topic_suggestion=""
        self.suggestion_index=0
        self.user_logs=[]

    def preload(self, mentors):
        for mentor in mentors:
            # start NPCEditor first because it takes a while to load
            if self.mode=='ensemble' or self.mode=='npceditor':
                os.system("{0} {1}".format(os.path.abspath(os.path.join('', '..', 'NPCEditor.app', 'run-npceditor')), mentor))
            self.load_mentor(mentor)
            # temporarily asking mentors a question to warm up classifier
            # need to figure out why loading topic_model works for commandline but not vhmsg
            if self.mode=='ensemble' or self.mode=='classifier':
                self.set_mentor(mentor)

    def load_mentor(self, id):
        self.mentorsById[id]=mentor.Mentor(id)

    def set_mentor(self, id):
        if id not in self.mentorsById:
            self.load_mentor(id)
        self.mentor=self.mentorsById[id]
        self.cpp.set_mentor(self.mentor)
        if self.mode=='ensemble' or self.mode=='classifier':
            self.classifier.set_mentor(self.mentor)
        if self.mode=='ensemble' or self.mode=='npceditor':
            self.npc.set_mentor(self.mentor)

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
        #Classifier is trained with and without topic vectors to provide flexibility
        self.classifier.train_lstm()
        self.classifier.train_classifier()
        if mode=='train_test_mode':
            self.test_data=json.load(open(os.path.join("mentors",mentor.mentorId,"test_data","lr_test_data.json"),'r'))
            self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))]
            self.y_test=[self.test_data[i][3] for i in range(len(self.test_data))]
            self.cl_y_test_unfused, self.cl_y_pred_unfused, self.cl_y_test_fused, self.cl_y_pred_fused=self.classifier.test_classifier(use_topic_vectors=use_topic_vectors)
            self.npc.load_test_data()
            #self.get_all_answers()

    '''
    Return the list of topics to the GUI
    '''
    def get_topics(self):
        return self.mentor.topics

    '''
    Checks if the question is off-topic. This function is not completed yet.
    '''
    def is_off_topic(self, question):
        return False

    #information to track must be discussed with Ben, Nick, Kayla
    def start_session(self):
        self.session_started=True

    #play intro clip
    def play_intro(self):
        return self.mentor.utterances_prompts['_INTRO_'][0]

    #play idle clip
    def play_idle(self):
        return self.mentor.utterances_prompts['_IDLE_'][0]

    def end_session(self):
        self.session_started=False
        self.blacklist.clear()

    def quit(self):
        if self.mode=='ensemble' or self.mode=='npceditor':
            for mentor in self.mentorsById:
                self.npc.close_npceditor(self.mentorsById[mentor].id)
            self.npc.close_vhmsg()

    '''
    This method checks the status of the question: whether it is an off-topic or a repeat. Other statuses can be added here.
    '''
    def check_input(self, pal3_input):
        #if question is a special case - HANDLE SHOW IDLE CASE

        #check if null or empty string
        if pal3_input.strip() == '':
            return '_EMPTY_'

        if pal3_input in self.pal3_status_codes:
            return pal3_input

        #if question is off-topic
        if self.is_off_topic(pal3_input):
            return '_OFF_TOPIC_'

        #if question is repeat
        if pal3_input in self.blacklist:
            return '_REPEAT_'
        else:
            return '_NEW_QUESTION_'

    '''
    This method returns the appropriate prompt for a particular question status
    '''
    def return_prompt(self, input_status):
        return_id=None
        return_answer=None
        return_score=0.0

        # Select a prompt and return it
        if input_status=="_START_SESSION_":
            self.start_session()
            return_id, return_answer, return_score=('_START_', self.mentor.name, self.mentor.title)

        elif input_status=="_END_SESSION_":
            self.end_session()
            return_id, return_answer=('no_video', '_END_')

        elif input_status=="_INTRO_":
            if ('_INTRO_' in self.mentor.utterances_prompts):
                return_id, return_answer=self.play_intro()

        elif input_status=="_IDLE_":
            if ('_IDLE_' in self.mentor.utterances_prompts):
                return_id, return_answer=self.play_idle()

        elif input_status=="_TIME_OUT_" or input_status=='_EMPTY_':
            #load a random prompt from file and return it.
            #The choice of prompt can also be based on the topic of the last asked question
            #This will help drive the conversation in the direction we want so that an agenda can be maintained
            if ('_PROMPT_' in self.mentor.utterances_prompts):
                len_timeouts=len(self.mentor.utterances_prompts['_PROMPT_'])
                index=random.randint(0,len_timeouts-1)
                return_id, return_answer=self.mentor.utterances_prompts['_PROMPT_'][index]

        elif input_status=="_OFF_TOPIC_":
            #load off-topic feedback clip and play it
            if ('_OFF_TOPIC_' in self.mentor.utterances_prompts):
                len_offtopic=len(self.mentor.utterances_prompts['_OFF_TOPIC_'])
                index=random.randint(0,len_offtopic-1)
                return_id, return_answer=self.mentor.utterances_prompts['_OFF_TOPIC_'][index]
                return_score=-100.0

        elif input_status=="_REPEAT_":
            #load repeat feedback clip and play it
            if ('_REPEAT_' in self.mentor.utterances_prompts):
                len_repeat=len(self.mentor.utterances_prompts['_REPEAT_'])
                index=random.randint(0,len_repeat-1)
                return_id, return_answer=self.mentor.utterances_prompts['_REPEAT_'][index]
                return_score=-200.0

        elif input_status=="_REPEAT_BUMP_":
            #load repeat feedback clip and play it
            if ('_REPEAT_BUMP_' in self.mentor.utterances_prompts):
                len_repeat=len(self.mentor.utterances_prompts['_REPEAT_BUMP_'])
                index=random.randint(0,len_repeat-1)
                return_id, return_answer=self.mentor.utterances_prompts['_REPEAT_BUMP_'][index]
                return_score=-300.0

        return return_id, return_answer, return_score

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
    Get answer from NPCEditor
    '''
    def get_npceditor_answer(self, question, use_topic_vectors=True):
        start_time_npc=time.time()
        self.npc.send_request(question)
        npceditor_id, npceditor_score, npceditor_answer, similar_responses=self.npc.parse_single_xml()
        end_time_npc=time.time()
        elapsed_npc=end_time_npc-start_time_npc
        print("Time to fetch NPCEditor answer {0} is {1}".format(npceditor_id, str(elapsed_npc)))

        # if chosen response is a repeat, check for similar responses
        if (not self.use_repeats and npceditor_id in self.blacklist):
            for response in similar_responses:
                if response['ID'] not in self.blacklist:
                    print("Answer {0} is a repeat, chose {1} instead".format(npceditor_id, response['ID']))
                    npceditor_score=response['score']
                    npceditor_id=response['ID']
                    npceditor_answer=response['text']

        return npceditor_id, npceditor_score, npceditor_answer

    '''
    Get answer from classifier
    '''
    def get_classifier_answer(self, question, use_topic_vectors=True):
        start_time=time.time()
        classifier_id, classifier_answer=self.classifier.get_answer(question, use_topic_vectors=use_topic_vectors)
        if classifier_id=="_OFF_TOPIC_":
            classifier_id, classifier_answer, other = self.return_prompt("_OFF_TOPIC_")
        end_time=time.time()
        elapsed=end_time-start_time
        print("Time to fetch classifier answer is "+str(elapsed))
        return classifier_id, classifier_answer

    '''
    When only one answer is required for a single question, use this method. You can choose to use or not use the topic vectors by
    passing the named parameter as True or False.
    '''
    def get_one_answer(self, question, use_topic_vectors=True):
        return_id=None
        return_answer=None
        return_score=0.0

        if self.mode=='ensemble':
            npceditor_id, npceditor_score, npceditor_answer = self.get_npceditor_answer(question, use_topic_vectors)
            if npceditor_answer=="answer_none":
                classifier_id, classifier_answer = self.get_classifier_answer(question, use_topic_vectors)
                return_id=classifier_id
                return_answer=classifier_answer
                print("Answer from classifier chosen")
            else:
                if float(npceditor_score) < -5.59054:
                    classifier_id, classifier_answer = self.get_classifier_answer(question, use_topic_vectors)
                    return_id=classifier_id
                    return_answer=classifier_answer
                    print("Answer from classifier chosen") #this might be uncertain, maybe grab an _OFF_TOPIC
                else:
                    return_id=npceditor_id
                    return_answer=npceditor_answer
                    return_score=npceditor_score
                    print("Answer from NPCEditor chosen")

        elif self.mode=='npceditor':
            npceditor_id, npceditor_score, npceditor_answer = self.get_npceditor_answer(question, use_topic_vectors)
            if npceditor_answer=='answer_none' or float(npceditor_score) < -5.59054:
                return self.return_prompt('_OFF_TOPIC_')
            else:
                return_id=npceditor_id
                return_answer=npceditor_answer
                return_score=npceditor_score
                print("Answer from NPCEditor chosen")

        elif self.mode=='classifier':
            classifier_id, classifier_answer = self.get_classifier_answer(question, use_topic_vectors)
            return_id=classifier_id
            return_answer=classifier_answer
            print("Answer from classifier chosen")

        # Handle repeats
        if (not self.use_repeats):
            if (return_id in self.blacklist):
                # Handle bumper messages
                if (self.should_bump):
                    self.should_bump=False
                    return self.return_prompt('_REPEAT_BUMP_')
                self.should_bump=True
                return self.return_prompt('_REPEAT_')
            else:
                if (len(self.blacklist) == self.num_blacklisted_repeats):
                    self.blacklist.pop(0)
                self.should_bump=False
                self.blacklist.append(return_id)

        Logger.logData(self.mentor, question, "", classifier_answer, return_answer, return_id, float(0), 1.0)
        return return_id, return_answer, return_score

    def get_redirect_answer(self):
        self.use_repeats=True
        question = self.suggest_question('STEM')[0]
        print("ask: " + question)
        return_id, return_answer, return_score = self.get_one_answer(question)
        self.use_repeats=False
        return return_id, return_answer, return_score

    '''
    When you want to get an answer to a question, this method will be used. Flexibility to use/not use topic vectors is provided.
    For special cases like time-out, user diverting away from topic, etc., pass a pre-defined message as the question.
    check_question(question) will handle the pre-defined message and an appropriate prompt will be returned.
    For example, when PAL3 times out, a message like "PAL3 has timed out due to no response from user" will be sent as the question.
    self.special_cases will have this message stored already and a question_status will be linked to it like:
    "PAL3 has timed out due to no response from user": "pal3_timeout". This question status will trigger an appropriate prompt
    from return_prompt
    '''
    def process_input_from_ui(self, pal3_input, use_topic_vectors=True):
        input_status=self.check_input(pal3_input) #check the question status
        #if the question is legitimate, then fetch answer
        if input_status=='_NEW_QUESTION_':
            if not self.session_started:
                self.return_prompt('_START_SESSION_')
            answer=self.get_one_answer(pal3_input, use_topic_vectors=use_topic_vectors)
            self.user_logs.append({"Question": pal3_input, "Answer":answer[1]})
        #Statuses that require a prompt from the mentor
        else:
            answer=self.return_prompt(input_status)
            if input_status=='_END_SESSION_':
                #write log to file.
                time_now=datetime.datetime.now()
                filename='log_'+str(time_now.hour)+'_'+str(time_now.minute)+'_'+str(time_now.month)+'_'+str(time_now.day)+'_'+str(time_now.year)+'.log'
                if len(self.user_logs) > 0:
                    keys=self.user_logs[0].keys()
                    with open(filename, 'w') as log_file:
                        dict_writer = csv.DictWriter(log_file, keys)
                        dict_writer.writeheader()
                        dict_writer.writerows(self.user_logs)
        # answer=self.get_one_answer(question, use_topic_vectors=use_topic_vectors)
        return answer

    '''
    Suggest a question to the user
    '''
    def suggest_question(self, topic):
        if topic=='Job Specific':
            topic='jobspecific'

        if (topic.lower() in self.mentor.suggestions):
            candidate_questions=self.mentor.suggestions[topic.lower()]
            if (self.last_topic_suggestion == topic):
                self.suggestion_index=(self.suggestion_index + 1) % len(candidate_questions)
            else:
                self.suggestion_index=random.randint(0,len(candidate_questions)-1)

            selected_question=candidate_questions[self.suggestion_index]
            self.last_topic_suggestion=topic
            return (selected_question[0].capitalize(), selected_question[1], selected_question[2])

        return ('', '', '')
