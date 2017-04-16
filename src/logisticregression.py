import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
import cPickle


class LogisticClassifier(object):
    def __init__(self):
        self.train_data=None
        self.test_data=None
        self.train_topic_vectors=None
        self.test_topic_vectors=None
        self.ids_answer=None
        self.logistic_model=None
        self.x_train=[]
        self.x_test=[]
        self.y_train=[]
        self.y_test=[]

    def load_data(self):
        self.train_data=cPickle.load(open('training_data/lr_train_data.pickle','rb'))
        self.test_data=cPickle.load(open('training_data/lr_test_data.pickle','rb'))
        self.train_topic_vectors=cPickle.load(open('training_data/train_topic_vectors.pickle','rb'))
        #self.test_topic_vectors=cPickle.load('training_data/test_topic_vectors.pickle')
        self.ids_answer=cPickle.load(open('training_data/ids_answer.pickle','rb'))

    def create_unfused_vectors(self):
        self.x_train=[self.train_data[i][1] for i in range(len(self.train_data))] #no of utterances * no_of_sequences * 300
        self.y_train=[self.train_data[i][2] for i in range(len(self.train_data))] #No_of_utterances * no_of_classes (40)
        self.x_train=np.asarray(self.x_train)

        self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))] #no of utterances * no_of_sequences * 300
        self.y_test=[self.test_data[i][2] for i in range(len(self.test_data))] #No_of_utterances * no_of_classes (40)
        self.x_test=np.asarray(self.x_test)

    def create_fused_vectors(self):
        for i in range(0,len(self.train_data)):
            self.x_train.append(np.concatenate((self.train_data[i][1], self.train_topic_vectors[i][1])))
        self.x_train=np.asarray(self.x_train)

    def train_lr():
        self.logistic_model=LogisticRegression()
        self.logistic_model.fit(x_train, y_train)


    #def test_lr():


