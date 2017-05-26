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
        self.logistic_model_unfused=None
        self.logistic_model_fused=None
        self.x_train_fused=[]
        self.x_test_fused=[]
        self.y_train_fused=[]
        self.y_test_fused=[]
        self.x_train_unfused=[]
        self.x_test_unfused=[]
        self.y_train_unfused=[]
        self.y_test_unfused=[]
        self.test_questions=[]

    '''
    Load the data (unpickle the data) from the .pkl files.
    '''
    def load_data(self):
        self.lc.ids_answer=cPickle.load(open('train_data/ids_answer.pkl','rb'))
        self.train_data=cPickle.load(open('train_data/lr_train_data.pkl','rb'))
        try:
            self.train_topic_vectors=cPickle.load(open('train_data/train_topic_vectors.pkl','rb'))
            self.test_data=cPickle.load(open('test_data/lr_test_data.pkl','rb'))
            self.test_topic_vectors=cPickle.load(open('test_data/test_topic_vectors.pkl','rb'))
        except:
            pass

    '''
    Create the training vectors.
    '''
    def create_vectors(self):
        print "Not using topic vectors"
        self.x_train_unfused=[self.train_data[i][1] for i in range(len(self.train_data))]
        self.y_train_unfused=[self.train_data[i][3] for i in range(len(self.train_data))]
        self.x_train_unfused=np.asarray(self.x_train_unfused)
        try:
            self.x_test_unfused=[self.test_data[i][1] for i in range(len(self.test_data))]
            self.y_test_unfused=[self.test_data[i][3] for i in range(len(self.test_data))]
            self.x_test_unfused=np.asarray(self.x_test_unfused)
        except:
            pass

        print "Using topic vectors"
        for i in range(0,len(self.train_data)):
            self.x_train_fused.append(np.concatenate((self.train_data[i][1], self.train_topic_vectors[i][1])))
        self.x_train_fused=np.asarray(self.x_train_fused)
        self.y_train_fused=[self.train_data[i][3] for i in range(len(self.train_data))]
        try:
            for i in range(0,len(self.test_data)):
                self.x_test_fused.append(np.concatenate((self.test_data[i][1], self.test_topic_vectors[i][1])))
            self.x_test_fused=np.asarray(self.x_test_fused)
            self.y_test_fused=[self.test_data[i][3] for i in range(len(self.test_data))]
        except:
            pass
        
        self.test_questions=[self.test_data[i][0] for i in range(len(self.test_data))]

    '''
    Train the LR classifier.
    '''
    def train_lr(self):
        print "Training without topic vectors"
        self.logistic_model_unfused=LogisticRegression()
        self.logistic_model_unfused.fit(self.x_train_unfused, self.y_train_unfused)
        joblib.dump(self.logistic_model_unfused, 'train_data/unfused_model.pkl')

        print "Training with topic vectors"
        self.logistic_model_fused=LogisticRegression()
        self.logistic_model_fused.fit(self.x_train_fused, self.y_train_fused)
        joblib.dump(self.logistic_model_fused, 'train_data/fused_model.pkl')

    '''
    Test the LR classifier.
    '''
    def test_lr(self, use_topic_vectors=True):
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
        method='fused'
        if not use_topic_vectors:
            method='unfused'
        with open('test_data/predictions_'+method+'.csv','w') as pred_file:
            pred_df.to_csv(pred_file, index=False)

        print "Accuracy: "+str(self.logistic_model.score(self.x_test, self.y_test))
        print "F-1: "+str(f1_score(self.y_test, y_pred, average='micro'))
        return self.y_test, y_pred

    '''
    For a single question, get the predicted answer.
    '''
    def get_prediction(self, w2v_vector, topic_vector, use_topic_vectors=True):
        method='fused'
        if not use_topic_vectors:
            method='unfused'
        self.logistic_model=joblib.load('train_data/'+method+'_model.pkl')
        if not use_topic_vectors:
            test_vector=w2v_vector
        else:
            test_vector=np.concatenate((w2v_vector, topic_vector))

        test_vector=test_vector.reshape(1,-1)
        prediction=self.logistic_model.predict(test_vector)
        return prediction[0], self.ids_answer[prediction[0]]


