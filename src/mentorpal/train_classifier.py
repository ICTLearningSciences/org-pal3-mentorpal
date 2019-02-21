import os
import numpy as np
import pandas as pd

from sklearn import metrics
from sklearn.externals import joblib
from sklearn.model_selection import cross_val_score
from sklearn.linear_model import RidgeClassifier
from sklearn.model_selection import cross_val_score, cross_val_predict
from gensim.models.keyedvectors import KeyedVectors
from keras.preprocessing.sequence import pad_sequences
from keras.models import Sequential
from keras.layers import LSTM, Activation, Dense, Dropout
from keras.callbacks import ModelCheckpoint

from mentorpal.iclassifier import IClassifier
from mentorpal.mentor_classifier import MentorClassifier

'''
TrainClassifier uses MentorClassifier to get answers, but can also train classifier model
'''
class TrainClassifier(IClassifier):
    def __init__(self, mentor):
        self.mentor_classifier = MentorClassifier(mentor)
        self.mentor = self.mentor_classifier.mentor

    def get_answer(self, question):
        return self.mentor_classifier.get_answer(question)

    '''
    Trains the classifier on the given training data file
    
    Args:
        train_file:  (string) file name of the training data to load
        save: (bool) whether classifier should save retrained model to file
    Returns:
        scores: (float array) cross validation scores for training data
        accuracy: (float) accuracy score for training data
    '''
    def train_model(self, train_file, save=False):
        path = os.path.join("mentors", self.mentor.id, "data", train_file)
        training_data = self.mentor.load_training_data(path)

        train_vectors, lstm_train_vectors = self.__load_training_vectors(training_data)
        train_vectors, lstm_train_data = self.__load_topic_vectors(train_vectors, lstm_train_vectors)
        x_train, y_train = self.__load_xy_train(lstm_train_data)

        topic_model, new_vectors = self.__train_lstm(lstm_train_data, x_train, y_train)
        x_train_fused, y_train_fused, x_train_unfused, y_train_unfused = self.__load_fused_unfused(train_vectors, new_vectors)
        scores, accuracy, logistic_model_fused, logistic_model_unfused = self.__train_lr(x_train_fused, y_train_fused, x_train_unfused, y_train_unfused)

        if save is True:
            self.__write_data(lstm_train_data, train_vectors, new_vectors, topic_model, logistic_model_fused, logistic_model_unfused)

        return scores, accuracy



    def __load_training_vectors(self, train_data):
        train_vectors=[]
        lstm_train_vectors=[]

        #for each data point, get w2v vector for the question and store in train_vectors.
        #instance=<question, processed_question, topic, answer_id, answer_text>
        for instance in train_data:
            w2v_vector, lstm_vector=self.mentor_classifier.get_w2v(instance[1])
            train_vectors.append([instance[0],w2v_vector.tolist(),instance[2],instance[4]])
            lstm_train_vectors.append(lstm_vector)

        #For the LSTM, each training sample will have a max dimension of 300 x 25. For those that don't, the pad_sequences
        #function will pad sequences of [0, 0, 0, 0....] vectors to the end of each sample.
        padded_vectors=pad_sequences(lstm_train_vectors,maxlen=25, dtype='float32',padding='post',truncating='post',value=0.)
        lstm_train_vectors=padded_vectors

        return train_vectors, lstm_train_vectors

    def __load_topic_vectors(self, train_vectors, lstm_train_vectors):
        lstm_train_data = []

        #Generate the sparse topic train_vectors
        for i in range(len(train_vectors)):
            question=train_vectors[i][0]
            vector=train_vectors[i][1]
            current_topics=train_vectors[i][2]
            topic_vector=[0]*len(self.mentor.topics)
            for j in range(len(self.mentor.topics)):
                if self.mentor.topics[j] in current_topics:
                    topic_vector[j]=1
            train_vectors[i][2]=topic_vector
            lstm_train_data.append([question, lstm_train_vectors[i].tolist(), topic_vector])

        return train_vectors, lstm_train_data

    def __load_xy_train(self, lstm_train_data):
        x_train = None
        y_train = None

        x_train=[lstm_train_data[i][1] for i in range(len(lstm_train_data))] #no of utterances * no_of_sequences * 300
        y_train=[lstm_train_data[i][2] for i in range(len(lstm_train_data))] #No_of_utterances * no_of_classes (40)
        x_train=np.asarray(x_train)

        return x_train, y_train

    def __load_fused_unfused(self, train_data, train_topic_vectors):
        x_train_fused=[]
        y_train_fused=[]
        x_train_unfused=[]
        y_train_unfused=[]

        x_train_unfused=[train_data[i][1] for i in range(len(train_data))]
        y_train_unfused=[train_data[i][3] for i in range(len(train_data))]
        x_train_unfused=np.asarray(x_train_unfused)

        for i in range(0,len(train_data)):
            x_train_fused.append(np.concatenate((train_data[i][1], train_topic_vectors[i][1])))
        x_train_fused=np.asarray(x_train_fused)
        y_train_fused=[train_data[i][3] for i in range(len(train_data))]

        return x_train_fused, y_train_fused, x_train_unfused, y_train_unfused

    def __train_lstm(self, train_data, x_train, y_train):
        #don't pass summed vectors
        nb_samples=len(train_data)
        nb_each_sample=len(train_data[0][1])
        nb_features=len(train_data[0][1][0])
        nb_classes=len(train_data[0][2])

        topic_model=Sequential()
        topic_model.add(LSTM(nb_features, input_shape=(nb_each_sample,nb_features), dropout=0.5, recurrent_dropout=0.1))
        topic_model.add(Dropout(0.5))
        topic_model.add(Dense(nb_classes))
        topic_model.add(Activation('softmax'))
        topic_model.compile(loss='categorical_crossentropy',optimizer='adam',metrics=['accuracy'])
        filepath=os.path.join("mentors",self.mentor.id,"train_data",'lstm_model')
        checkpoint=ModelCheckpoint(filepath, monitor='val_acc',verbose=1, save_best_only=True, mode='max')
        callbacks_list=[checkpoint]
        hist=topic_model.fit(np.array(x_train), np.array(y_train), batch_size=32, epochs=30, validation_split=0.1, callbacks=callbacks_list, verbose=1)

        new_vectors=[]
        topic_model.load_weights(filepath)
        topic_model.compile(loss='categorical_crossentropy',optimizer='adam',metrics=['accuracy'])
        for i in range(0,len(train_data)):
            current_sample=x_train[i][np.newaxis, :, :]
            prediction=topic_model.predict(current_sample)
            new_vectors.append([train_data[i][0],prediction[0].tolist()])
            
        return topic_model, new_vectors

    def __train_lr(self, x_train_fused, y_train_fused, x_train_unfused, y_train_unfused):
        param_grid = {'C': np.power(10.0, np.arange(-3, 3)) }
        logistic_model_unfused=RidgeClassifier(alpha=1.0)
        logistic_model_unfused.fit(x_train_unfused, y_train_unfused)
        logistic_model_fused=RidgeClassifier(alpha=1.0)
        logistic_model_fused.fit(x_train_fused, y_train_fused)

        scores=cross_val_score(logistic_model_fused, x_train_fused, y_train_fused, cv=2)
        predicted = cross_val_predict(logistic_model_fused, x_train_fused, y_train_fused, cv=2)
        accuracy = metrics.accuracy_score(y_train_fused, predicted)

        return scores, accuracy, logistic_model_fused, logistic_model_unfused

    def __write_data(self, lstm_train_data, train_vectors, new_vectors, topic_model, logistic_model_fused, logistic_model_unfused):
        #dump lstm_train_data
        with open(os.path.join("mentors",self.mentor.id,"train_data","lstm_train_data.json"),'w') as json_file:
            json.dump(lstm_train_data, json_file)
        
        #dump train_vectors for logistic regression
        with open(os.path.join("mentors",self.mentor.id,"train_data","lr_train_data.json"),'w') as json_file:
            json.dump(train_vectors,json_file)
            
        with open(os.path.join("mentors",self.mentor.id,"train_data","train_topic_vectors.json"),'w') as json_file:
            json.dump(new_vectors, json_file)

        topic_model.save(os.path.join("mentors",self.mentor.id,"train_data","lstm_topic_model.h5"))
        joblib.dump(logistic_model_fused, os.path.join("mentors",self.mentor.id,"train_data","fused_model.pkl"))
        joblib.dump(logistic_model_unfused, os.path.join("mentors",self.mentor.id,"train_data","unfused_model.pkl"))
