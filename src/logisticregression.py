import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.externals import joblib
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
        self.train_data=cPickle.load(open('training_data/lr_train_data.pkl','rb'))
        try:
            self.train_topic_vectors=cPickle.load(open('training_data/train_topic_vectors.pkl','rb'))
            self.test_data=cPickle.load(open('training_data/lr_test_data.pkl','rb'))
            self.test_topic_vectors=cPickle.load('training_data/test_topic_vectors.pkl')
        except:
            pass

    def create_unfused_vectors(self):
        self.x_train=[self.train_data[i][1] for i in range(len(self.train_data))]
        self.y_train=[self.train_data[i][3] for i in range(len(self.train_data))]
        self.x_train=np.asarray(self.x_train)
        try:
            self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))]
            self.y_test=[self.test_data[i][3] for i in range(len(self.test_data))]
            self.x_test=np.asarray(self.x_test)
        except:
            pass

    def create_fused_vectors(self):
        for i in range(0,len(self.train_data)):
            self.x_train.append(np.concatenate((self.train_data[i][1], self.train_topic_vectors[i][1])))
        self.x_train=np.asarray(self.x_train)
        self.y_train=[self.train_data[i][3] for i in range(len(self.train_data))]

    def train_lr(self, method='fused'):
        self.logistic_model=LogisticRegression()
        self.logistic_model.fit(self.x_train, self.y_train)
        joblib.dump(self.logistic_model, 'training_data/'+method+'_model.pkl')

    def test_lr(self):
        for i in range(0,len(self.x_test)):
            sample=self.x_test[i].reshape(1,-1)
            prediction=self.logistic_model.predict(sample)
            print self.test_data[i][0]
            print "Actual answer"
            print self.ids_answer[self.test_data[i][3]]
            print "Predicted answer"
            print self.ids_answer[prediction[0]]
            print "\n"

        print self.logistic_model.score(self.x_test, self.y_test)

    def get_prediction(self, w2v_vector, topic_vector, method='fused'):
        print "Using "+method+" model"
        self.logistic_model=joblib.load('training_data/'+method+'_model.pkl')
        if method=='fused':
            test_vector=np.concatenate((w2v_vector, topic_vector))
        else:
            test_vector=w2v_vector

        test_vector=test_vector.reshape(1,-1)
        prediction=self.logistic_model.predict(test_vector)
        return self.ids_answer[prediction[0]]


