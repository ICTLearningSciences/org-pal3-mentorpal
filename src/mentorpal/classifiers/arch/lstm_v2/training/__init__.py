import os

import numpy as np
import pandas as pd
from sklearn import metrics
from sklearn.externals import joblib
from sklearn.linear_model import RidgeClassifier
from sklearn.model_selection import cross_val_score, cross_val_predict
from gensim.models.keyedvectors import KeyedVectors
from keras.preprocessing.sequence import pad_sequences
from keras.models import Sequential
from keras.layers import LSTM, Activation, Dense, Dropout
from keras.callbacks import ModelCheckpoint

from .. import LSTMClassifier
from mentorpal.classifiers.training import ClassifierTraining, ClassifierTrainingFactory, register_classifier_training_factory
from mentorpal.mentor import Mentor
from mentorpal.nltk_preprocessor import NLTKPreprocessor
from mentorpal.text_feature_generator import TextFeatureGenerator
from mentorpal.utils import normalize_topics
from mentorpal.w2v import W2V


# CheckpointClassifierFactory impl that will get registered globally for this arch ('lstm_v1')
class __ClassifierTrainingFactory(ClassifierTrainingFactory):
    def create(self, checkpoint, mentors):
        return TrainLSTMClassifier(mentors, checkpoint)


# NOTE: always make sure this module lives in `mentorpal.classifiers.arch.${ARCH}`
# so that it can be discovered/loaded by arch name
register_classifier_training_factory(LSTMClassifier.get_arch(), __ClassifierTrainingFactory())


'''
Wrapper class for LSTMClassifier that trains the classifier
'''
class TrainLSTMClassifier(ClassifierTraining):

    
    def __init__(self, mentor, checkpoint):
        assert isinstance(mentor, Mentor)
        assert isinstance(checkpoint, str)
        self.mentor = mentor
        self.checkpoint = checkpoint
        self.model_path = os.path.join(self.checkpoint, mentor.get_id())
        self.w2v = W2V()


    def train(self):
        '''
        Trains the classifier on the given training data file
        
        Args:
            train_data:  (string) path of the training data to load
        Returns:
            scores: (float array) cross validation scores for training data
            accuracy: (float) accuracy score for training data
        '''
        if not os.path.exists(self.model_path):
            os.makedirs(self.model_path)
        training_data = self.__load_training_data(self.mentor.mentor_data_path('classifier_data.csv'))
        train_vectors, lstm_train_vectors = self.__load_training_vectors(training_data)
        train_vectors, lstm_train_data = self.__load_topic_vectors(train_vectors, lstm_train_vectors)
        x_train, y_train = self.__load_xy_train(lstm_train_data)
        self.topic_model, new_vectors = self.__train_lstm(lstm_train_data, x_train, y_train)
        x_train_fused, y_train_fused, x_train_unfused, y_train_unfused = self.__load_fused_unfused(train_vectors, new_vectors)
        print('TRAINING LR')
        scores, accuracy, self.logistic_model_fused, self.logistic_model_unfused = self.__train_lr(x_train_fused, y_train_fused, x_train_unfused, y_train_unfused)
        return scores, accuracy


    def save(self, to_path=None):
        to_path = to_path or self.model_path
        self.topic_model.save(os.path.join(to_path,"lstm_topic_model.h5"))
        joblib.dump(self.logistic_model_fused, os.path.join(to_path,"fused_model.pkl"))
        joblib.dump(self.logistic_model_unfused, os.path.join(to_path,"unfused_model.pkl"))


    def __load_training_data(self, path):
        train_data_csv=pd.read_csv(path)
        corpus=train_data_csv.fillna('')
        preprocessor=NLTKPreprocessor()
        textfeaturegen = TextFeatureGenerator()
        train_data=[]
        for i in range(0,len(corpus)):
            # normalized topics
            topics=corpus.iloc[i]['topics'].split(",")
            topics=[_f for _f in topics if _f]
            topics=normalize_topics(topics)
            # question
            questions=corpus.iloc[i]['question'].split('\n')
            questions=[_f for _f in questions if _f]
            current_question=questions[0]
            # answer
            answer=corpus.iloc[i]['text']
            answer_id=corpus.iloc[i]['ID']
            answer=answer.replace('\u00a0',' ')
            # univariate features
            univariate_features_question = textfeaturegen.univariate_features(current_question)          
            #add question to dataset
            processed_question=preprocessor.transform(current_question) # tokenize the question
            # a row that will be added to train_data; because <list>.append([]) returns None
            train_data_row = [current_question,processed_question,topics,answer_id,answer]
            # extending the train_data_row with univariate features
            train_data_row.extend(univariate_features_question)
            # ERROR BELOW: adding None to training_data because <list>.append([]) returns None
            train_data.append(train_data_row)
            #look for paraphrases and add them to dataset
            paraphrases=questions[1:]
            for i in range(0,len(paraphrases)):
                processed_paraphrase=preprocessor.transform(paraphrases[i])
                univariate_features_paraphrase = textfeaturegen.univariate_features(paraphrases[i])
                # a row that will be added to train_data; because <list>.append([]) returns None
                train_data_row_paraphrase = [paraphrases[i],processed_paraphrase,topics,answer_id,answer]
                # extending the train_data_row_paraphrase with univariate features
                train_data_row_paraphrase.extend(univariate_features_paraphrase)
                # ERROR BELOW: adding None to training_data because <list>.append([]) returns None
                train_data.append(train_data_row_paraphrase)
        print('########### train_data', train_data[0])

        return train_data


    def __load_training_vectors(self, train_data):
        train_vectors=[]
        lstm_train_vectors=[]
        #for each data point, get w2v vector for the question and store in train_vectors.
        #instance=<question, processed_question, topic, answer_id, answer_text, univariate_features[5 to 12]>
        for instance in train_data:
            w2v_vector, lstm_vector = self.w2v.w2v_for_question(instance[1])
            train_vectors_row = [instance[0],w2v_vector.tolist(),instance[2],instance[4]]
            train_vectors_row.extend(instance[5:13])
            train_vectors.append(train_vectors_row)
            lstm_train_vectors.append(lstm_vector)
        #For the LSTM, each training sample will have a max dimension of 300 x 25. For those that don't, the pad_sequences
        #function will pad sequences of [0, 0, 0, 0....] vectors to the end of each sample.
        padded_vectors=pad_sequences(lstm_train_vectors,maxlen=25, dtype='float32',padding='post',truncating='post',value=0.)
        lstm_train_vectors=padded_vectors
        print('########### train_vectors', len(train_vectors[0]))
        print('########### train_vectors', train_vectors[0])
        return train_vectors, lstm_train_vectors


    def __load_topic_vectors(self, train_vectors, lstm_train_vectors):
        lstm_train_data = []
        #Generate the sparse topic train_vectors
        for i in range(len(train_vectors)):
            question=train_vectors[i][0]
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
        print('########### x_train', x_train.shape)
        print('########### x_train', x_train[0])
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
            x_train_fused.append(np.concatenate((train_data[i][1], train_topic_vectors[i][1], train_data[i][5:13])))
        x_train_fused=np.asarray(x_train_fused)
        y_train_fused=[train_data[i][3] for i in range(len(train_data))]
        print('########### X-train_fused', x_train_fused.shape)

        return x_train_fused, y_train_fused, x_train_unfused, y_train_unfused


    def __train_lstm(self, train_data, x_train, y_train):
        #don't pass summed vectors
        nb_each_sample=len(train_data[0][1])
        nb_features=len(train_data[0][1][0])
        nb_classes=len(train_data[0][2])
        topic_model=Sequential()
        topic_model.add(LSTM(nb_features, input_shape=(nb_each_sample,nb_features), dropout=0.5, recurrent_dropout=0.1))
        topic_model.add(Dropout(0.5))
        topic_model.add(Dense(nb_classes))
        topic_model.add(Activation('softmax'))
        topic_model.compile(loss='categorical_crossentropy',optimizer='adam',metrics=['accuracy'])
        filepath=os.path.join(self.model_path,'lstm_model')
        checkpoint=ModelCheckpoint(filepath, monitor='val_acc',verbose=1, save_best_only=True, mode='max')
        callbacks_list=[checkpoint]
        topic_model.fit(np.array(x_train), np.array(y_train), batch_size=32, epochs=30, validation_split=0.1, callbacks=callbacks_list, verbose=1)
        new_vectors=[]
        topic_model.load_weights(filepath)
        topic_model.compile(loss='categorical_crossentropy',optimizer='adam',metrics=['accuracy'])
        for i in range(0,len(train_data)):
            current_sample=x_train[i][np.newaxis, :, :]
            prediction=topic_model.predict(current_sample)
            new_vectors.append([train_data[i][0],prediction[0].tolist()])
        return topic_model, new_vectors


    def __train_lr(self, x_train_fused, y_train_fused, x_train_unfused, y_train_unfused):
        logistic_model_unfused=RidgeClassifier(alpha=1.0)
        print('############ x_train_fused in LR', x_train_fused.shape)
        print('############ x_train_fused in LR', x_train_fused[0])
        logistic_model_unfused.fit(x_train_unfused, y_train_unfused)
        logistic_model_fused=RidgeClassifier(alpha=1.0)
        logistic_model_fused.fit(x_train_fused, y_train_fused)
        scores=cross_val_score(logistic_model_fused, x_train_fused, y_train_fused, cv=2)
        predicted = cross_val_predict(logistic_model_fused, x_train_fused, y_train_fused, cv=2)
        accuracy = metrics.accuracy_score(y_train_fused, predicted)
        return scores, accuracy, logistic_model_fused, logistic_model_unfused

    