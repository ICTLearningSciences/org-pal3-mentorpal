import string
import csv
from gensim.models.keyedvectors import KeyedVectors
import numpy as np
from keras.models import Sequential
from keras.layers import LSTM, Activation, Dense, Dropout
from keras.callbacks import ModelCheckpoint
from sklearn.preprocessing import MinMaxScaler
from sklearn.metrics import mean_squared_error
import cPickle
import os

os.environ['TF_CPP_MIN_LOG_LEVEL']='2'  #tensorflow log level

train_data=None
test_data=None

answer_ids={}
all_topics=[]
last_id=0
w2v_model=None
topic_model=None
def read_training_data():
    global train_data, test_data
    train_data=cPickle.load(open('lstm_train_data.pickle','rb'))
    test_data=cPickle.load(open('lstm_test_data.pickle','rb'))

def train_lstm():
    #don't pass summed vectors
    global topic_model
    x_train=[train_data[i][0] for i in range(len(train_data))] #no of utterances * no_of_sequences * 300
    y_train=[train_data[i][1] for i in range(len(train_data))] #No_of_utterances * no_of_classes (40)
    x_train=np.asarray(x_train)

    x_test=[test_data[i][0] for i in range(len(test_data))] #no of utterances * no_of_sequences * 300
    y_test=[test_data[i][1] for i in range(len(test_data))] #No_of_utterances * no_of_classes (40)
    x_test=np.asarray(x_test)

    nb_samples=len(train_data)
    nb_each_sample=len(train_data[0][0])
    nb_features=len(train_data[0][0][0])
    nb_classes=len(train_data[0][1])

    #input_length not working
    #no of epochs?
    topic_model=Sequential()
    topic_model.add(LSTM(nb_features, input_shape=(nb_each_sample,nb_features), dropout=0.5, recurrent_dropout=0.1))
    topic_model.add(Dropout(0.5))
    topic_model.add(Dense(nb_classes))
    topic_model.add(Activation('softmax'))
    topic_model.compile(loss='categorical_crossentropy',optimizer='adam',metrics=['accuracy'])
    print(topic_model.summary())
    filepath='lstm_model'
    checkpoint=ModelCheckpoint(filepath, monitor='val_acc',verbose=1, save_best_only=True, mode='max')
    callbacks_list=[checkpoint]
    hist=topic_model.fit(x_train, y_train, batch_size=32, epochs=1, validation_split=0.1, callbacks=callbacks_list, verbose=1)
    topic_model.load_weights(filepath)
    topic_model.compile(loss='categorical_crossentropy',optimizer='adam',metrics=['accuracy'])

def test_lstm():
    #predict here
    trainpredict=topic_model.predict(x_train)
    testpredict=topic_model.predict(x_test)
    print testpredict[0], len(testpredict[0])

if __name__=='__main__':
    read_training_data()
    train_lstm()
