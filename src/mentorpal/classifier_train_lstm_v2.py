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

from mentorpal.utils import normalize_topics
from mentorpal.nltk_preprocessor import NLTKPreprocessor
from mentorpal.text_feature_generator import TextFeatureGenerator
from mentorpal.classifier_lstm_v1 import LSTMClassifier

'''
Wrapper class for LSTMClassifier that trains the classifier
'''
class TrainLSTMClassifierV2(LSTMClassifier):
    TRAINING_DEFAULT_PATH = os.path.join('mentors','{0}','data','classifier_data.csv')
    
    def __init__(self, mentor, checkpoint = LSTMClassifier.DEFAULT_CHECKPOINT):
        super().__init__(mentor, checkpoint) 

    '''
    Trains the classifier on the given training data file
    
    Args:
        train_data:  (string) path of the training data to load
    Returns:
        scores: (float array) cross validation scores for training data
        accuracy: (float) accuracy score for training data
    '''
    def train_model(self, train_data=TRAINING_DEFAULT_PATH):
        model_path = self.get_model_path()
        if not os.path.exists(model_path):
            os.makedirs(model_path)

        training_data = self.__load_training_data(train_data.format(self.mentor.id))
        train_vectors, lstm_train_vectors = self.__load_training_vectors(training_data)
        train_vectors, lstm_train_data = self.__load_topic_vectors(train_vectors, lstm_train_vectors)
        x_train, y_train = self.__load_xy_train(lstm_train_data)
        topic_model, new_vectors = self.__train_lstm(lstm_train_data, x_train, y_train)
        x_train_fused, y_train_fused = self.__load_fused(train_vectors, new_vectors)
        scores, accuracy, logistic_model_fused = self.__train_lr(x_train_fused, y_train_fused)

        self.__save_model(topic_model, logistic_model_fused)

        return scores, accuracy

    def __load_training_data(self, path):
        train_data_csv=pd.read_csv(path)
        corpus=train_data_csv.fillna('')
        preprocessor=NLTKPreprocessor()
        features=TextFeatureGenerator()
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
            processed_question=preprocessor.transform(current_question) # tokenize the question
            # answer
            answer=corpus.iloc[i]['text']
            answer_id=corpus.iloc[i]['ID']
            answer=answer.replace('\u00a0',' ')
            #Generate text features
            negation_feature = features.any_negation(current_question)
            wordcount_feature = features.log_wordcount(current_question)
            negmod_feature = features.negation_mod(current_question)
            whatques_feature = features.what_question(current_question)
            howques_feature = features.how_question(current_question)
            whyques_feature = features.why_question(current_question)
            whenques_feature = features.when_question(current_question)
            whereques_feature = features.where_question(current_question)
            #add question to dataset
            # train_data.append([current_question,processed_question,topics,answer_id,answer])
            train_data.append([current_question,processed_question,topics,answer_id,answer,negation_feature,wordcount_feature,negmod_feature,whatques_feature,howques_feature,whyques_feature,whenques_feature,whereques_feature])
            
            #look for paraphrases and add them to dataset
            paraphrases=questions[1:]
            for i in range(0,len(paraphrases)):
                processed_paraphrase=preprocessor.transform(paraphrases[i])
                negation_feature = features.any_negation(paraphrases[i])
                wordcount_feature = features.log_wordcount(paraphrases[i])
                negmod_feature = features.negation_mod(paraphrases[i])
                whatques_feature = features.what_question(paraphrases[i])
                howques_feature = features.how_question(paraphrases[i])
                whyques_feature = features.why_question(paraphrases[i])
                whenques_feature = features.when_question(paraphrases[i])
                whereques_feature = features.where_question(paraphrases[i])

                # train_data.append([paraphrases[i],processed_paraphrase,topics,answer_id,answer])
                train_data.append([paraphrases[i],processed_paraphrase,topics,answer_id,answer,negation_feature,wordcount_feature,negmod_feature,whatques_feature,howques_feature,whyques_feature,whenques_feature,whereques_feature])
        
        return train_data

    def __load_training_vectors(self, train_data):
        train_vectors=[]
        lstm_train_vectors=[]

        #for each data point, get w2v vector for the question and store in train_vectors.
        #instance=<question, processed_question, topic, answer_id, answer_text>
        for instance in train_data:
            w2v_vector, lstm_vector=self._LSTMClassifier__get_w2v(instance[1])
            # train_vectors.append([instance[0],w2v_vector.tolist(),instance[2],instance[4]])
            train_vectors.append([instance[0],w2v_vector.tolist(),instance[2],instance[3],instance[4],instance[5],instance[6],instance[7],instance[8],instance[9],instance[10],instance[11],instance[12]])
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

    def __load_fused(self, train_data, train_topic_vectors):
        x_train_fused=[]
        y_train_fused=[]

        for i in range(0,len(train_data)):
            # x_train_fused.append(np.concatenate((train_data[i][1], train_topic_vectors[i][1])))
            x_train_fused.append(np.concatenate((train_data[i][1], train_topic_vectors[i][1], train_data[i][5:])))
        x_train_fused=np.asarray(x_train_fused)
        y_train_fused=[train_data[i][4] for i in range(len(train_data))]

        return x_train_fused, y_train_fused

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
        model_path = self.get_model_path()
        filepath=os.path.join(model_path,'lstm_model')
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

    def __train_lr(self, x_train_fused, y_train_fused):
        param_grid = {'C': np.power(10.0, np.arange(-3, 3)) }
        logistic_model_fused=RidgeClassifier(alpha=1.0)
        logistic_model_fused.fit(x_train_fused, y_train_fused)

        scores=cross_val_score(logistic_model_fused, x_train_fused, y_train_fused, cv=2)
        predicted = cross_val_predict(logistic_model_fused, x_train_fused, y_train_fused, cv=2)
        accuracy = metrics.accuracy_score(y_train_fused, predicted)

        return scores, accuracy, logistic_model_fused

    def __save_model(self, topic_model, logistic_model_fused):
        self.topic_model = topic_model
        self.logistic_model = logistic_model_fused

        model_path = self.get_model_path()
        topic_model.save(os.path.join(model_path,"lstm_topic_model.h5"))
        joblib.dump(logistic_model_fused, os.path.join(model_path,"fused_model.pkl"))
