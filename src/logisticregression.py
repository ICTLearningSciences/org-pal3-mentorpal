import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
import cPickle


train_data=None
test_data=None
train_topic_vectors=None
test_topic_vectors=None
ids_answer=None
logistic_model=None
def load_data():
    global train_data, test_data, train_topic_vectors, test_topic_vectors, ids_answer
    train_data=cPickle.load('lr_train_data.pickle')
    test_data=cPickle.load('lr_test_data.pickle')
    train_topic_vectors=cPickle.load('train_topic_vectors.pickle')
    test_topic_vectors=cPickle.load('test_topic_vectors.pickle')
    ids_answer=cPickle.load('ids_answer.pickle')

def fuse_vectors():

def train_lr():
    global logistic_model
    x_train=[train_data[i][0] for i in range(len(train_data))] #no of utterances * no_of_sequences * 300
    y_train=[train_data[i][1] for i in range(len(train_data))] #No_of_utterances * no_of_classes (40)
    x_train=np.asarray(x_train)

    x_test=[test_data[i][0] for i in range(len(test_data))] #no of utterances * no_of_sequences * 300
    y_test=[test_data[i][1] for i in range(len(test_data))] #No_of_utterances * no_of_classes (40)
    x_test=np.asarray(x_test)
    logistic_model=LogisticRegression()
    logistic_model.fit(x_train, y_train)


def test_lr():

    






