import string
import csv
import cPickle
import os
import numpy as np
from gensim.models.keyedvectors import KeyedVectors
from keras.models import Sequential, load_model
from keras.layers import LSTM, Activation, Dense, Dropout
from keras.callbacks import ModelCheckpoint
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error
#TensorFlow log level to supress unwanted messages.
os.environ['TF_CPP_MIN_LOG_LEVEL']='2'  #tensorflow log level

class TopicLSTM(object):
    def __init__(self):
        self.train_data=None
        self.test_data=None

        self.answer_ids={}
        self.all_topics=[]
        self.last_id=0
        self.w2v_model=None
        self.topic_model=None
        self.x_train=None
        self.y_train=None
        self.x_test=None
        self.y_test=None
        self.new_vectors=[]

    def read_training_data(self):
        self.train_data=cPickle.load(open('training_data/lstm_train_data.pkl','rb'))
        self.test_data=cPickle.load(open('training_data/lstm_test_data.pkl','rb'))
        self.x_train=[self.train_data[i][1] for i in range(len(self.train_data))] #no of utterances * no_of_sequences * 300
        self.y_train=[self.train_data[i][2] for i in range(len(self.train_data))] #No_of_utterances * no_of_classes (40)
        self.x_train=np.asarray(self.x_train)
        try:
            self.x_test=[self.test_data[i][1] for i in range(len(self.test_data))] #no of utterances * no_of_sequences * 300
            self.y_test=[self.test_data[i][2] for i in range(len(self.test_data))] #No_of_utterances * no_of_classes (40)
            self.x_test=np.asarray(self.x_test)
        except:
            pass

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
        filepath='training_data/lstm_model'
        checkpoint=ModelCheckpoint(filepath, monitor='val_acc',verbose=1, save_best_only=True, mode='max')
        callbacks_list=[checkpoint]
        hist=self.topic_model.fit(self.x_train, self.y_train, batch_size=32, epochs=30, validation_split=0.1, callbacks=callbacks_list, verbose=1)
        # print (self.topic_model.evaluate(self.x_test,self.y_test))
        self.topic_model.load_weights(filepath)
        self.topic_model.compile(loss='categorical_crossentropy',optimizer='adam',metrics=['accuracy'])
        self.topic_model.save('training_data/lstm_topic_model.h5')
        for i in range(0,len(self.train_data)):
            current_sample=self.x_train[i][np.newaxis, :, :]
            prediction=self.topic_model.predict(current_sample)
            self.new_vectors.append([self.train_data[i][0],prediction[0]])

        with open('training_data/train_topic_vectors.pkl','wb') as pickle_file:
            cPickle.dump(self.new_vectors, pickle_file)


    def test_lstm(self):
        #predict here
        #testpredict=topic_model.predict(x_test)
        ans = self.topic_model.evaluate(x_test, y_test)
        print ans
        #print testpredict[0], len(testpredict[0])
    
    def get_topic_vector(self, lstm_vector):
        self.topic_model=load_model('training_data/lstm_topic_model.h5')
        predicted_vector=self.topic_model.predict(lstm_vector)
        return predicted_vector[0]
