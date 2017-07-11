import pandas as pd
import numpy as np
from sklearn import metrics
from sklearn.linear_model import LogisticRegression, RidgeClassifier
from sklearn.externals import joblib
from sklearn.metrics import f1_score, mean_squared_error
from sklearn.model_selection import cross_val_score, cross_val_predict, GridSearchCV, validation_curve
import pickle
import os
import json

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
    Load the data (unpickle the data) from the .json files.
    '''
    def load_data(self):
        self.ids_answer=json.load(open(os.path.join("train_data","ids_answer.json"),'r'))
        self.train_data=json.load(open(os.path.join("train_data","lr_train_data.json"),'r'))
        try:
            self.train_topic_vectors=json.load(open(os.path.join("train_data","train_topic_vectors.json"),'r'))
            self.test_data=json.load(open(os.path.join("test_data","lr_test_data.json"),'r'))
            self.test_topic_vectors=json.load(open(os.path.join("test_data","test_topic_vectors.json"),'r'))
        except:
            pass

    '''
    Create the training vectors.
    '''
    def create_vectors(self):
        print("Not using topic vectors")
        self.x_train_unfused=[self.train_data[i][1] for i in range(len(self.train_data))]
        self.y_train_unfused=[self.train_data[i][3] for i in range(len(self.train_data))]
        self.x_train_unfused=np.asarray(self.x_train_unfused)
        try:
            self.x_test_unfused=[self.test_data[i][1] for i in range(len(self.test_data))]
            self.y_test_unfused=[self.test_data[i][3] for i in range(len(self.test_data))]
            self.x_test_unfused=np.asarray(self.x_test_unfused)
        except:
            pass

        print("Using topic vectors")
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

    def plot_validation_curve(self, train_scores, test_scores):
        train_scores_mean = np.mean(train_scores, axis=1)
        train_scores_std = np.std(train_scores, axis=1)
        test_scores_mean = np.mean(test_scores, axis=1)
        test_scores_std = np.std(test_scores, axis=1)
        param_range = np.power(10.0, np.arange(-3, 3))
        plt.title("Validation Curve with Ridge")
        plt.xlabel("alpha")
        plt.ylabel("Score")
        plt.ylim(0.0, 1.1)
        lw = 2
        plt.semilogx(param_range, train_scores_mean, label="Training score",
                    color="darkorange", lw=lw)
        plt.fill_between(param_range, train_scores_mean - train_scores_std,
                        train_scores_mean + train_scores_std, alpha=0.2,
                        color="darkorange", lw=lw)
        plt.semilogx(param_range, test_scores_mean, label="Cross-validation score",
                    color="navy", lw=lw)
        plt.fill_between(param_range, test_scores_mean - test_scores_std,
                        test_scores_mean + test_scores_std, alpha=0.2,
                        color="navy", lw=lw)
        plt.legend(loc="best")
        plt.show()
    '''
    Train the LR classifier.
    '''
    def train_lr(self):
        param_grid = {'C': np.power(10.0, np.arange(-3, 3)) }
        print("Training without topic vectors")
        # lr=LogisticRegression(penalty='l2', C=1.0)
        # self.logistic_model_unfused=GridSearchCV(lr, param_grid)
        self.logistic_model_unfused=RidgeClassifier(alpha=1.0)
        self.logistic_model_unfused.fit(self.x_train_unfused, self.y_train_unfused)
        #print(self.logistic_model_unfused.best_params_, self.logistic_model_unfused.best_score_)
        joblib.dump(self.logistic_model_unfused, os.path.join("train_data","unfused_model.pkl"))
        #self.plot_validation_curve(train_scores, valid_scores)
        # scores=cross_val_score(self.logistic_model_unfused, self.x_train_unfused, self.y_train_unfused, cv=2)
        # print(scores)
        # predicted = cross_val_predict(self.logistic_model_unfused, self.x_train_unfused, self.y_train_unfused, cv=2)
        # print(metrics.accuracy_score(self.y_train_unfused, predicted))

        print("Training with topic vectors")
        # lr=LogisticRegression(penalty='l2')
        # self.logistic_model_fused=GridSearchCV(lr, param_grid)
        self.logistic_model_fused=RidgeClassifier(alpha=1.0)
        self.logistic_model_fused.fit(self.x_train_fused, self.y_train_fused)
        #print(self.logistic_model_fused.best_params_, self.logistic_model_fused.best_score_)
        joblib.dump(self.logistic_model_fused, os.path.join("train_data","fused_model.pkl"))
        #self.plot_validation_curve(train_scores, valid_scores)
        # scores=cross_val_score(self.logistic_model_fused, self.x_train_fused, self.y_train_fused, cv=2)
        # print(scores)
        # predicted = cross_val_predict(self.logistic_model_fused, self.x_train_fused, self.y_train_fused, cv=2)
        # print(metrics.accuracy_score(self.y_train_fused, predicted))

    '''
    Test the classifier and evaluate performance. This is only for testing performance. This won't be used in the system flow.
    '''
    def test_lr(self, use_topic_vectors=True):
        y_pred_fused=[]
        pred_data_fused=[]
        y_pred_unfused=[]
        pred_data_unfused=[]

        for i in range(0,len(self.x_test_unfused)):
            sample=self.x_test_unfused[i].reshape(1,-1)
            prediction=self.logistic_model_unfused.predict(sample)
            y_pred_unfused.append(prediction[0])
            current_sample={}
            current_sample['question']=self.test_questions[i]
            current_sample['predicted_answer']=self.ids_answer[prediction[0]]
            current_sample['actual_answer']=self.ids_answer[self.y_test_unfused[i]]
            pred_data_unfused.append(current_sample)

        pred_df_unfused=pd.DataFrame(pred_data_unfused, columns=['question','predicted_answer','actual_answer'])
        with open(os.path.join("test_data","predictions_unfused.csv"),'w') as pred_file:
            pred_df_unfused.to_csv(pred_file, index=False)

        #print(self.x_test_unfused)
        #print(self.y_test_unfused)
        print("Accuracy: "+str(self.logistic_model_unfused.score(self.x_test_unfused, self.y_test_unfused)))
        print("F-1: "+str(f1_score(self.y_test_unfused, y_pred_unfused, average='micro')))

        for i in range(0,len(self.x_test_fused)):
            sample=self.x_test_fused[i].reshape(1,-1)
            prediction=self.logistic_model_fused.predict(sample)
            y_pred_fused.append(prediction[0])
            current_sample={}
            current_sample['question']=self.test_questions[i]
            current_sample['predicted_answer']=self.ids_answer[prediction[0]]
            current_sample['actual_answer']=self.ids_answer[self.y_test_fused[i]]
            pred_data_fused.append(current_sample)

        pred_df_fused=pd.DataFrame(pred_data_fused, columns=['question','predicted_answer','actual_answer'])
        with open(os.path.join("test_data","predictions_fused.csv"),'w') as pred_file:
            pred_df_fused.to_csv(pred_file, index=False)

        print("Accuracy: "+str(self.logistic_model_fused.score(self.x_test_fused, self.y_test_fused)))
        print("F-1: "+str(f1_score(self.y_test_fused, y_pred_fused, average='micro')))
        

        return self.y_test_unfused, y_pred_unfused, self.y_test_fused, y_pred_fused

    '''
    This is the method that will be used to get an answer for a question in the system flow. When user asks a question, this is 
    the method that will return the answer predicted by the classifier
    '''
    def get_prediction(self, w2v_vector, topic_vector, use_topic_vectors=True):
        method='fused'
        if not use_topic_vectors:
            method='unfused'
        self.logistic_model=joblib.load(os.path.join("train_data",method+"_model.pkl"))
        if not use_topic_vectors:
            test_vector=w2v_vector
        else:
            test_vector=np.concatenate((w2v_vector, topic_vector))

        test_vector=test_vector.reshape(1,-1)
        prediction=self.logistic_model.predict(test_vector)
        return prediction[0], self.ids_answer[prediction[0]]


