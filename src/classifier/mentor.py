import pandas as pd
import os
import json
import csv
import pickle
import time
from keras.models import Sequential, load_model

class Mentor(object):
    def __init__(self, id):
        self.id = id
        self.name=None
        self.title=None
        self.utterances_prompts={} #responses for the special cases
        self.suggestions={}
        self.topic_set=set()
        self.topics=[]
        self.lr_test_data=None
        self.classifier_data=None
        self.lstm_topic_model=None

        if id == 'clint':
            self.name="Clinton Anderson"
            self.title="Nuclear Electrician's Mate"
        elif id == 'dan':
            self.name="Dan Davis"
            self.title="High Performance Computing Researcher"
        elif id == 'julianne':
            self.name="Julianne Nordhagen"
            self.title="Placeholder is Here"
        self.load()

    def load(self):
        self.classifier_data=pd.read_csv(os.path.join("mentors",self.id,"data","classifier_data.csv"))
        self.load_test_data()
        self.load_topics()
        self.load_utterances()
        self.load_suggestions()

    def load_topic_model(self):
        start_time=time.time()
        if self.lstm_topic_model == None:
            self.lstm_topic_model=load_model(os.path.join("mentors",self.id,"train_data","lstm_topic_model.h5"))
        end_time=time.time()
        elapsed=end_time-start_time
        print("   Time to load topic model is "+str(elapsed))
        return self.lstm_topic_model

    def load_test_data(self):
        self.lr_test_data=json.load(open(os.path.join("mentors",self.id,"test_data","lr_test_data.json"),'r'))

    def load_topics(self):
        self.topics=[]
        with open(os.path.join("mentors",self.id,"data","topics.csv")) as f:
            reader=csv.reader(f)
            for row in reader:
                self.topics.append(row[0].lower())

        self.topics.remove('navy')
        self.topics.remove('positive')
        self.topics.remove('negative')
        self.topics=[_f.title() for _f in self.topics]
        for i in range(len(self.topics)):
            if self.topics[i]=='Jobspecific':
                self.topics[i]='JobSpecific'
            if self.topics[i]=='Stem':
                self.topics[i]='STEM'

    def load_utterances(self):
        self.utterance_df=pd.read_csv(open(os.path.join("mentors",self.id,"data","utterance_data.csv"),'rb'))
        for i in range(len(self.utterance_df)):
            situation=self.utterance_df.iloc[i]['situation']
            video_name=self.utterance_df.iloc[i]['ID']
            utterance=self.utterance_df.iloc[i]['utterance']
            if situation in self.utterances_prompts:
                self.utterances_prompts[situation].append((video_name, utterance))
            else:
                self.utterances_prompts[situation]=[(video_name, utterance)]

    def load_suggestions(self):
        corpus=pd.read_csv(os.path.join("mentors",self.id,"data","classifier_data.csv"))
        corpus=corpus.fillna('')

        for i in range(0,len(corpus)):
            topics=corpus.iloc[i]['topics'].split(",")
            topics=[_f for _f in topics if _f]
            #normalize the topics
            topics=self.normalize_topics(topics)

            questions=corpus.iloc[i]['question'].split('\r\n')
            questions=[_f for _f in questions if _f]

            answer=corpus.iloc[i]['text']
            answer_id=corpus.iloc[i]['ID']
            #remove nbsp and \"
            answer=answer.replace('\u00a0',' ')

            for question in questions:
                for topic in topics:
                    if topic!='Navy' or topic!='Positive' or topic!='Negative':
                        if topic in self.suggestions:
                            self.suggestions[topic].append((question, answer, answer_id))
                        else:
                            self.suggestions[topic]=[(question, answer, answer_id)]

    def normalize_topics(self, topics):
        ret_topics=[]
        self.topic_set=set()
        for topic in topics:
            topic=topic.strip()
            topic=topic.lower()
            ret_topics.append(topic)
            self.topic_set.add(topic)
        return ret_topics
