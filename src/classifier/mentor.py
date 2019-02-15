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
        self.topics=[]
        self.utterances_prompts={} #responses for the special cases
        self.suggestions={}
        self.ids_answer={}
        self.answer_ids={}

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
        self.topics = self.load_topics()
        self.utterances_prompts = self.load_utterances()
        self.suggestions = self.load_suggestions()
        self.ids_answers, self.answer_ids = self.load_ids_answers()

    def load_topics(self):
        topics=[]
        with open(os.path.join("mentors",self.id,"data","topics.csv")) as f:
            reader=csv.reader(f)
            for row in reader:
                topics.append(row[0].lower())
        # don't include these topics: navy positive negative
        topics.remove('navy')
        topics.remove('positive')
        topics.remove('negative')
        topics=[_f.title() for _f in topics]
        # normalize topic names
        for i in range(len(topics)):
            if topics[i]=='Jobspecific':
                topics[i]='JobSpecific'
            if topics[i]=='Stem':
                topics[i]='STEM'
        return topics
    
    def load_utterances(self):
        utterances_prompts={}
        utterance_df=pd.read_csv(open(os.path.join("mentors",self.id,"data","utterance_data.csv"),'rb'))
        for i in range(len(utterance_df)):
            situation=utterance_df.iloc[i]['situation']
            video_name=utterance_df.iloc[i]['ID']
            utterance=utterance_df.iloc[i]['utterance']
            if situation in utterances_prompts:
                utterances_prompts[situation].append((video_name, utterance))
            else:
                utterances_prompts[situation]=[(video_name, utterance)]
        return utterances_prompts

    def load_suggestions(self):
        suggestions={}
        classifier_data=pd.read_csv(os.path.join("mentors",self.id,"data","classifier_data.csv"))
        corpus=classifier_data.fillna('')
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
                        if topic in suggestions:
                            suggestions[topic].append((question, answer, answer_id))
                        else:
                            suggestions[topic]=[(question, answer, answer_id)]
        return suggestions

    def load_ids_answers(self):
        classifier_data=pd.read_csv(os.path.join("mentors",self.id,"data","classifier_data.csv"))
        corpus=classifier_data.fillna('')
        answer_ids={}
        ids_answer={}

        for i in range(0,len(corpus)):
            answer=corpus.iloc[i]['text']
            answer_id=corpus.iloc[i]['ID']
            answer=answer.replace('\u00a0',' ')
            answer_ids[answer]=answer_id
            ids_answer[answer_id]=answer
                
        return ids_answer, answer_ids

    def load_testing_data(self):
        test_data_csv=pd.read_csv(os.path.join("mentors",self.id,"data","testing_data.csv"))
        corpus=test_data_csv.fillna('')
        preprocessor=classifier_preprocess.NLTKPreprocessor()
        test_data=[]

        for i in range(0,len(corpus)):
            # normalized topics
            topics=corpus.iloc[i]['topics'].split(",")
            topics=[_f for _f in topics if _f]
            topics=self.normalize_topics(topics)
            # question
            questions=corpus.iloc[i]['question'].split('\n')
            questions=[_f for _f in questions if _f]
            current_question=questions[0]
            processed_question=preprocessor.transform(current_question) # tokenize the question
            # answer
            answer=corpus.iloc[i]['text']
            answer_id=corpus.iloc[i]['ID']
            answer=answer.replace('\u00a0',' ')

            #add question to dataset
            test_data.append([current_question,processed_question,topics,answer_id])
            #look for paraphrases and add them to dataset
            paraphrases=questions[1:]
            for i in range(0,len(paraphrases)):
                processed_paraphrase=preprocessor.transform(paraphrases[i])
                test_data.append([paraphrases[i],processed_paraphrase,topics,answer_id])

    def load_training_data(self):
        train_data_csv=pd.read_csv(os.path.join("mentors",self.id,"data","training_data.csv"))
        corpus=train_data_csv.fillna('')
        preprocessor=classifier_preprocess.NLTKPreprocessor()
        train_data=[]

        for i in range(0,len(corpus)):
            # normalized topics
            topics=corpus.iloc[i]['topics'].split(",")
            topics=[_f for _f in topics if _f]
            topics=self.normalize_topics(topics)
            # question
            questions=corpus.iloc[i]['question'].split('\n')
            questions=[_f for _f in questions if _f]
            current_question=questions[0]
            # answer
            answer=corpus.iloc[i]['text']
            answer_id=corpus.iloc[i]['ID']
            answer=answer.replace('\u00a0',' ')
            #add question to dataset
            processed_question=preprocessor.transform(current_question) # tokenize the question
            train_data.append([current_question,processed_question,topics,answer_id,answer])
            #look for paraphrases and add them to dataset
            paraphrases=questions[1:]
            for i in range(0,len(paraphrases)):
                processed_paraphrase=preprocessor.transform(paraphrases[i])
                train_data.append([paraphrases[i],processed_paraphrase,topics,answer_id,answer])
        
        return train_data

    def load_topic_model(self):
        return load_model(os.path.join("mentors",self.id,"train_data","lstm_topic_model.h5"))

    def get_training_data(self):
        training_data_path = os.path.join("mentors",self.id,"data","training_data.csv")
        return pd.read_csv(training_data_path, sep=',', header=0)

    def get_testing_data(self):
        testing_data_path = os.path.join("mentors",self.id,"data","testing_data.csv")
        return pd.read_csv(testing_data_path, sep=',', header=0)

    def normalize_topics(self, topics):
        ret_topics=[]
        for topic in topics:
            topic=topic.strip()
            topic=topic.lower()
            ret_topics.append(topic)
        return ret_topics
