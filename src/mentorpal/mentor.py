import pandas as pd
import os
import csv

from mentorpal.utils import normalize_topics
from mentorpal.nltk_preprocessor import NLTKPreprocessor

class Mentor(object):
    def __init__(self, id):
        self.id = id
        self.name=None
        self.title=None
        self.topics=[]
        self.utterances_prompts={} #responses for the special cases
        self.suggestions={}
        self.ids_answers={}
        self.answer_ids={}
        self.ids_questions={}
        self.question_ids={}
        # TODO: the mentor <name,title> metadata below needs to come from data files
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

    def get_id(self):
        return self.id

    def load(self):
        self.topics = self.load_topics()
        self.utterances_prompts = self.load_utterances()
        self.suggestions = self.load_suggestions()
        self.ids_answers, self.answer_ids, self.ids_questions, self.question_ids = self.load_ids_answers()


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
            topics=normalize_topics(topics)
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
        ids_answers={}
        question_ids={}
        ids_questions={}
        for i in range(0,len(corpus)):
            ID=corpus.iloc[i]['ID']
            answer=corpus.iloc[i]['text']
            answer=answer.replace('\u00a0',' ')
            answer_ids[answer]=ID
            ids_answers[ID]=answer
            questions=corpus.iloc[i]['question'].split('\n')
            for question in questions:
                question=question.replace('\u00a0',' ')
                question_ids[question]=ID
            ids_questions[ID]=questions
        return ids_answers, answer_ids, ids_questions, question_ids