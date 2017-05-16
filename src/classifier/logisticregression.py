import pandas as pd
import numpy as np
from sklearn.linear_model import LogisticRegression
from sklearn.externals import joblib
from sklearn.metrics import f1_score, mean_squared_error
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
        self.test_questions=[]

    def load_data(self):
        self.train_data=cPickle.load(open('train_data/lr_train_data.pkl','rb'))
        try:
            self.train_topic_vectors=cPickle.load(open('train_data/train_topic_vectors.pkl','rb'))
            self.test_data=cPickle.load(open('test_data/lr_test_data.pkl','rb'))
            self.test_topic_vectors=cPickle.load(open('test_data/test_topic_vectors.pkl','rb'))
        except:
            pass

    def create_vectors(self, mode='fused'):
        if mode=='unfused':
            print "unfused"
            self.x_train=[self.train_data[i][1] for i in range(len(self.train_data))]
            self.y_train=[self.train_data[i][3] for i in range(len(self.train_data))]
            self.x_train=np.asarray(self.x_train)
            try:
                self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))]
                self.y_test=[self.test_data[i][3] for i in range(len(self.test_data))]
                self.x_test=np.asarray(self.x_test)
                self.test_questions=[self.test_data[i][0] for i in range(len(self.test_data))]
            except:
                pass
        elif mode=='fused':
            for i in range(0,len(self.train_data)):
                self.x_train.append(np.concatenate((self.train_data[i][1], self.train_topic_vectors[i][1])))
            self.x_train=np.asarray(self.x_train)
            self.y_train=[self.train_data[i][3] for i in range(len(self.train_data))]
            try:
                for i in range(0,len(self.test_data)):
                    self.x_test.append(np.concatenate((self.test_data[i][1], self.test_topic_vectors[i][1])))
                self.x_test=np.asarray(self.x_test)
                self.y_test=[self.test_data[i][3] for i in range(len(self.test_data))]
                self.test_questions=[self.test_data[i][0] for i in range(len(self.test_data))]
            except:
                pass

    def train_lr(self, method='fused'):
        self.logistic_model=LogisticRegression()
        self.logistic_model.fit(self.x_train, self.y_train)
        joblib.dump(self.logistic_model, 'train_data/'+method+'_model.pkl')

    def test_lr(self, method='fused'):
        y_pred=[]
        pred_data=[]
        for i in range(0,len(self.x_test)):
            sample=self.x_test[i].reshape(1,-1)
            prediction=self.logistic_model.predict(sample)
            y_pred.append(prediction[0])
            current_sample={}
            current_sample['question']=self.test_questions[i]
            current_sample['predicted_answer']=self.ids_answer[prediction[0]]
            current_sample['actual_answer']=self.ids_answer[self.y_test[i]]
            pred_data.append(current_sample)

        pred_df=pd.DataFrame(pred_data, columns=['question','predicted_answer','actual_answer'])
        with open('test_data/predictions_'+method+'.csv','w') as pred_file:
            pred_df.to_csv(pred_file, index=False)

        print "Accuracy: "+str(self.logistic_model.score(self.x_test, self.y_test))
        print "F-1: "+str(f1_score(self.y_test, y_pred, average='micro'))
        return self.y_test, y_pred

    def get_prediction(self, w2v_vector, topic_vector, method='fused'):
        print "Using "+method+" model"
        self.logistic_model=joblib.load('train_data/'+method+'_model.pkl')
        if method=='fused':
            test_vector=np.concatenate((w2v_vector, topic_vector))
        else:
            test_vector=w2v_vector

        test_vector=test_vector.reshape(1,-1)
        prediction=self.logistic_model.predict(test_vector)
        return prediction[0], self.ids_answer[prediction[0]]


