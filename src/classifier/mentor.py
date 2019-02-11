import pandas as pd
import os
import json
import csv
import pickle
import time
import classifier_preprocess
from keras.models import Sequential, load_model

class Mentor(object):
    def __init__(self, id):
        self.id = id
        self.name=None
        self.title=None
        # 
        self.topics=[]
        self.topic_set=set()
        self.utterances_prompts={} #responses for the special cases
        self.suggestions={}
        # 
        self.classifier_data=None
        self.lr_test_data=None
        self.lstm_topic_model=None
        self.train_data=[]
        self.test_data=[]

        if id == 'clint':
            self.name="Clinton Anderson"
            self.title="Nuclear Electrician's Mate"
        elif id == 'dan':
            self.name="Dan Davis"
            self.title="High Performance Computing Researcher"
        elif id == 'julianne':
            self.name="Julianne Nordhagen"
            self.title="Student Naval Aviator"
        elif id == 'carlos':
            self.name= "Carlos Rios"
            self.title="Marine Logistician"

        self.load()

    def load(self):
        self.classifier_data=pd.read_csv(os.path.join("mentors",self.id,"data","classifier_data.csv"))
        self.load_topics()
        self.load_utterances()
        self.load_suggestions()
        self.load_testing_data()
        self.load_training_data()

    def load_topics(self):
        self.topics=[]
        with open(os.path.join("mentors",self.id,"data","topics.csv")) as f:
            reader=csv.reader(f)
            for row in reader:
                self.topics.append(row[0].lower())
        # don't include these topics: navy positive negative
        self.topics.remove('navy')
        self.topics.remove('positive')
        self.topics.remove('negative')
        self.topics=[_f.title() for _f in self.topics]
        # normalize topic names
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
            questions=corpus.iloc[i]['question'].split('\n')
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

    def load_testing_data(self):
        self.lr_test_data=json.load(open(os.path.join("mentors",self.id,"test_data","lr_test_data.json"),'r'))
        corpus=pd.read_csv(os.path.join("mentors",self.id,"data","testing_data.csv"))
        corpus=corpus.fillna('')
        total=0
        preprocessor=classifier_preprocess.NLTKPreprocessor()

        for i in range(0,len(corpus)):
            topics=corpus.iloc[i]['topics'].split(",")
            topics=[_f for _f in topics if _f]
            #normalize the topics
            topics=self.normalize_topics(topics)
            questions=corpus.iloc[i]['question'].split('\n')
            questions=[_f for _f in questions if _f]
            total+=len(questions)
            paraphrases=questions[1:]
            current_question=questions[0]
            answer=corpus.iloc[i]['text']
            answer_id=corpus.iloc[i]['ID']
            #remove nbsp and \"
            answer=answer.replace('\u00a0',' ')
            #Tokenize the question
            processed_question=preprocessor.transform(current_question)
            #add question to dataset
            self.test_data.append([current_question,processed_question,topics,answer_id])

            #look for paraphrases and add them to dataset
            for i in range(0,len(paraphrases)):
                processed_paraphrase=preprocessor.transform(paraphrases[i])
                self.test_data.append([paraphrases[i],processed_paraphrase,topics,answer_id])

    def load_training_data(self):
        corpus=pd.read_csv(os.path.join("mentors",self.id,"data","training_data.csv"))
        corpus=corpus.fillna('')
        total=0
        preprocessor=classifier_preprocess.NLTKPreprocessor()

        for i in range(0,len(corpus)):
            topics=corpus.iloc[i]['topics'].split(",")
            topics=[_f for _f in topics if _f]
            #normalize the topics
            topics=self.normalize_topics(topics)
            questions=corpus.iloc[i]['question'].split('\n')
            questions=[_f for _f in questions if _f]
            total+=len(questions)
            paraphrases=questions[1:]
            current_question=questions[0]
            answer=corpus.iloc[i]['text']
            answer_id=corpus.iloc[i]['ID']
            #remove nbsp and \"
            answer=answer.replace('\u00a0',' ')
            #Tokenize the question
            processed_question=preprocessor.transform(current_question)
            #add question to dataset
            self.train_data.append([current_question,processed_question,topics,answer_id])

            #look for paraphrases and add them to dataset
            for i in range(0,len(paraphrases)):
                processed_paraphrase=preprocessor.transform(paraphrases[i])
                self.train_data.append([paraphrases[i],processed_paraphrase,topics,answer_id])

    def load_topic_model(self):
        if self.lstm_topic_model == None:
            self.lstm_topic_model=load_model(os.path.join("mentors",self.id,"train_data","lstm_topic_model.h5"))
        return self.lstm_topic_model

    def normalize_topics(self, topics):
        ret_topics=[]
        self.topic_set=set()
        for topic in topics:
            topic=topic.strip()
            topic=topic.lower()
            ret_topics.append(topic)
            self.topic_set.add(topic)
        return ret_topics
