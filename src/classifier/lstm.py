import string
import csv
import pickle
import os
import json
import numpy as np
from gensim.models.keyedvectors import KeyedVectors
from keras.models import Sequential, load_model
from keras.layers import LSTM, Activation, Dense, Dropout
from keras.callbacks import ModelCheckpoint
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error, f1_score, accuracy_score
#TensorFlow log level to supress unwanted messages.
os.environ['TF_CPP_MIN_LOG_LEVEL']='2'  #tensorflow log level

class TopicLSTM(object):
    def __init__(self):
        self.train_data=None
        self.test_data=None
        self.all_topics=[]
        self.last_id=0
        self.w2v_model=None
        self.topic_model=None
        self.x_train=None
        self.y_train=None
        self.x_test=None
        self.y_test=None
        self.new_vectors=[]

    '''
    Read the training data for the LSTM from the pickle files.
    '''
    def read_training_data(self):
        self.train_data=json.load(open(os.path.join("train_data","lstm_train_data.json"),'r'))
        self.test_data=json.load(open(os.path.join("test_data","lstm_test_data.json"),'r'))
        self.x_train=[self.train_data[i][1] for i in range(len(self.train_data))] #no of utterances * no_of_sequences * 300
        self.y_train=[self.train_data[i][2] for i in range(len(self.train_data))] #No_of_utterances * no_of_classes (40)
        self.x_train=np.asarray(self.x_train)

        try:
            self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))] #no of utterances * no_of_sequences * 300
            self.y_test=[self.test_data[i][2] for i in range(len(self.test_data))] #No_of_utterances * no_of_classes (40)
            self.x_test=np.asarray(self.x_test)
        except:
            pass

    '''
    Train the LSTM with the train data and save the best model to file
    '''
    def train_lstm(self):
        #don't pass summed vectors
        nb_samples=len(self.train_data)
        nb_each_sample=len(self.train_data[0][1])
        nb_features=len(self.train_data[0][1][0])
        nb_classes=len(self.train_data[0][2])

        self.topic_model=Sequential()
        self.topic_model.add(LSTM(nb_features, input_shape=(nb_each_sample,nb_features), dropout=0.5, recurrent_dropout=0.1))
        #try this
        #topic_model.add(Dense(nb_classes, activation='sigmoid'))
        self.topic_model.add(Dropout(0.5))
        self.topic_model.add(Dense(nb_classes))
        self.topic_model.add(Activation('softmax'))
        self.topic_model.compile(loss='categorical_crossentropy',optimizer='adam',metrics=['accuracy'])
        print(self.topic_model.summary())
        filepath=os.path.join("train_data",'lstm_model')
        checkpoint=ModelCheckpoint(filepath, monitor='val_acc',verbose=1, save_best_only=True, mode='max')
        callbacks_list=[checkpoint]
        hist=self.topic_model.fit(self.x_train, self.y_train, batch_size=32, epochs=30, validation_split=0.1, callbacks=callbacks_list, verbose=1)
        # print (self.topic_model.evaluate(self.x_test,self.y_test))
        self.topic_model.load_weights(filepath)
        self.topic_model.compile(loss='categorical_crossentropy',optimizer='adam',metrics=['accuracy'])
        self.topic_model.save(os.path.join("train_data","lstm_topic_model.h5"))
        for i in range(0,len(self.train_data)):
            current_sample=self.x_train[i][np.newaxis, :, :]
            prediction=self.topic_model.predict(current_sample)
            self.new_vectors.append([self.train_data[i][0],prediction[0].tolist()])

        with open(os.path.join("train_data","train_topic_vectors.json"),'w') as json_file:
            json.dump(self.new_vectors, json_file)
        self.test_lstm()

    '''
    Test the performance of the LSTM with the test set. This won't be used during the system flow. This is for evaluation
    purposes only.
    '''
    def test_lstm(self):
        y_pred=[]
        for i in range(0,len(self.test_data)):
            current_sample=self.x_test[i][np.newaxis, :, :]
            prediction=self.topic_model.predict(current_sample)
            y_pred.append(prediction[0])
            self.new_vectors.append([self.test_data[i][0],prediction[0].tolist()])

        # print(y_pred)
        # print(self.y_test)
        # print("Accuracy: "+str(accuracy_score(self.y_test, y_pred)))

        # print("F-1: "+str(f1_score(self.y_test, y_pred, average='micro')))
        with open(os.path.join("test_data","test_topic_vectors.json"),'w') as json_file:
            json.dump(self.new_vectors, json_file)
    
    '''
    This is the method that will return the topic vector during system flow. When user asks a question and if method=='fused',
    this method will return the topic vector for the input question which will be used by the classifier to predict an answer.
    '''
    def get_topic_vector(self, lstm_vector):
        self.topic_model=load_model(os.path.join("train_data","lstm_topic_model.h5"))
        predicted_vector=self.topic_model.predict(lstm_vector)
        return predicted_vector[0]
