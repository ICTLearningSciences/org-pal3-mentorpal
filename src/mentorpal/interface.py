import csv
import sys
import os
import random
import datetime
import time

from mentorpal.train_classifier import TrainClassifier
from mentorpal.npceditor_interface import NPCEditor
from mentorpal.mentor import Mentor

class BackendInterface(object):
    num_blacklisted_repeats = 5
    pal3_status_codes={'_START_SESSION_', '_INTRO_', '_IDLE_', '_TIME_OUT_', '_END_SESSION_', '_EMPTY_'}

    def __init__(self, mode='ensemble'):
        self.mode=mode
        if self.mode is 'ensemble' or self.mode is 'npceditor':
            self.npc=NPCEditor()
        if self.mode is 'ensemble' or self.mode is 'classifier':
            self.classifier=None

        self.mentor=None
        self.mentorsById={}
        self.classifiersById={}

        #variables to keep track of session
        self.session_started=False
        self.use_repeats=False
        self.should_bump=False
        self.blacklist=list()
        self.last_topic_suggestion=""
        self.suggestion_index=0
        self.user_logs=[]

    '''
    Preload a mentor's NPCEditor and Classifier process before using the system.
    This is to avoid delays while asking questions. Will have a large delay when first starting instead.

    mentor_id: (str) id of mentor
    '''
    def preload(self, mentor_id):
        # start NPCEditor first because it takes a while to load
        if self.mode=='ensemble' or self.mode=='npceditor':
            os.system("{0} {1}".format(os.path.abspath(os.path.join('', '..', 'NPCEditor.app', 'run-npceditor')), mentor_id))
        
        # temporarily asking mentor a question to warm up classifier
        # need to figure out why loading topic_model works for commandline but not vhmsg
        if self.mode=='ensemble' or self.mode=='classifier':
            self.set_mentor(mentor_id)
            self.get_classifier_answer('asdf')

    '''
    Set the given mentor to be the active classifier and NPCEditor instance

    id: (str) id of mentor
    '''
    def set_mentor(self, id):
        if id not in self.mentorsById:
            self.mentorsById[id]=Mentor(id)

        self.mentor = self.mentorsById[id]

        if self.mode is 'ensemble' or self.mode is 'npceditor':
            self.npc.set_mentor(self.mentor)
        if self.mode is 'ensemble' or self.mode is 'classifier':
            if id not in self.classifiersById:
                self.classifiersById[id]=TrainClassifier(self.mentor)
            self.classifier=self.classifiersById[id]

    '''
    Retrain the current model
    
    returns:
        scores: ([float]) cross validation scores
        accuracy score: (float) training accuracy score
    '''
    def train(self):
        if self.mode is 'ensemble' or self.mode is 'classifier':
            scores, accuracy_score = self.classifier.train_model()
            return 'training:\ncross validation scores={0}\naccuracy score={1}'.format(scores, accuracy_score)

    '''
    Return the list of topics to the GUI
    '''
    def get_topics(self):
        return self.mentor.topics

    def start_session(self):
        self.session_started=True

    def end_session(self):
        self.session_started=False
        self.blacklist.clear()

    def quit(self):
        if self.mode=='ensemble' or self.mode=='npceditor':
            for mentor in self.mentorsById:
                self.npc.close_npceditor(self.mentorsById[mentor].id)
            self.npc.close_vhmsg()

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

    '''
    Get a random STEM question answer.
    Called when user asks two off topic or repeat questions in a row.
    '''
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
    def process_input_from_ui(self, pal3_input):
        input_status=self.check_input(pal3_input) #check the question status
        #if the question is legitimate, then fetch answer
        if input_status=='_NEW_QUESTION_':
            if not self.session_started:
                self.return_prompt('_START_SESSION_')
            answer=self.get_one_answer(pal3_input)
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
        return answer

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

    #play intro clip
    def play_intro(self):
        return self.mentor.utterances_prompts['_INTRO_'][0]

    #play idle clip
    def play_idle(self):
        return self.mentor.utterances_prompts['_IDLE_'][0]

    '''
    Get answer from NPCEditor
    '''
    def get_npceditor_answer(self, question, use_topic_vectors=True):
        self.npc.send_request(question)
        npceditor_id, npceditor_score, npceditor_answer, similar_responses=self.npc.parse_single_xml()

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
        classifier_id, classifier_answer, confidence=self.classifier.get_answer(question)
        if classifier_id=="_OFF_TOPIC_":
            classifier_id, classifier_answer, other = self.return_prompt("_OFF_TOPIC_")
        return classifier_id, classifier_answer, confidence

    '''
    When only one answer is required for a single question, use this method.
    '''
    def get_one_answer(self, question):
        return_id=None
        return_answer=None
        return_score=0.0

        # ensemble method uses both NPCEditor and Classifier
        if self.mode=='ensemble':
            # use NPCEditor first because it is better at exact matches
            return_id, return_answer, return_score = self.get_npceditor_answer(question)
            # if NPCEditor does not have an answer or a low-confidence answer, use classifier
            if return_answer=="answer_none" or float(return_score) < -5.59054:
                return_id, return_answer, return_score = self.get_classifier_answer(question)

        elif self.mode=='npceditor':
            return_id, return_answer, return_score = self.get_npceditor_answer(question)
            if return_answer=='answer_none' or float(return_score) < -5.59054:
                return self.return_prompt('_OFF_TOPIC_')

        elif self.mode=='classifier':
            return_id, return_answer, return_score = self.get_classifier_answer(question)

        # if system should not use repeat answers
        if (not self.use_repeats):
            # if answer has already been given recently
            if (return_id in self.blacklist):
                # if second repeat, state that question has been answered and suggest another question
                if (self.should_bump):
                    self.should_bump=False
                    return self.return_prompt('_REPEAT_BUMP_')
                # if first repeat, state that question has been answered before
                else:
                    self.should_bump=True
                    return self.return_prompt('_REPEAT_')
            # answer has not been given, add it to blacklist of recently answered questions
            else:
                if (len(self.blacklist) == self.num_blacklisted_repeats):
                    self.blacklist.pop(0)
                self.should_bump=False
                self.blacklist.append(return_id)

        return return_id, return_answer, return_score
