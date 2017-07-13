import lstm
import classifier_preprocess
import pickle
import os
import json
import logisticregression as lr
from gensim.models.keyedvectors import KeyedVectors
from keras.preprocessing.sequence import pad_sequences

class Classify(object):
    def __init__(self):
        self.cpp=classifier_preprocess.ClassifierPreProcess()
        self.tl=lstm.TopicLSTM()
        self.lc=lr.LogisticClassifier()
        #self.cpp.w2v_model=KeyedVectors.load_word2vec_format(os.path.join('..','GoogleNews-vectors-negative300.bin'), binary=True)
        self.cpp.w2v_model=KeyedVectors.load_word2vec_format(os.path.join('..','GoogleNews-vectors-negative300-SLIM.bin'), binary=True)
        self.lc.ids_answer=None

    '''
    Runs methods in classifier_preprocess.py to pre-process the data into formats that the classifier requires.
    '''
    def create_data(self, mode):
        print("Building dataset...")
        print("Reading topics...")
        self.cpp.read_topics()
        print("Reading data...")
        self.cpp.read_data(mode)
        print("Generate w2v vectors...")
        self.cpp.generate_training_vectors()
        self.cpp.generate_sparse_topic_vectors()
        print("write data...")
        self.cpp.write_data()
        

    '''
    Trains the topic LSTM by running methods in lstm.py
    '''
    def train_lstm(self):
        print("Starting LSTM topic training...")
        print("LSTM is reading training data...")
        self.tl.read_training_data()
        print("Training LSTM...")
        self.tl.train_lstm()
        print("Trained LSTM.")

    '''
    Trains the classifier by running methods in logisticregression.py
    '''
    def train_classifier(self):
        print("Starting LR training...")
        print("LR is reading training data...")
        self.lc.load_data()
        self.lc.create_vectors()
        print("Training LR...")
        self.lc.train_lr()
        print("Trained LR")

    '''
    Test the classifier performance. Used only when evaluating performance.
    '''
    def test_classifier(self, use_topic_vectors=True):
        y_test_unfused, y_pred_unfused, y_test_fused, y_pred_fused = self.lc.test_lr(use_topic_vectors=use_topic_vectors)
        return y_test_unfused, y_pred_unfused, y_test_fused, y_pred_fused

    '''
    When a question is asked, this method first normalizes the text using classifier_preprocess.py, then gets the 
    w2v_vector and lstm_vector. Then, it uses lstm.py to get the topic vector for the input question and finally, uses
    classifier in logisticregression.py to get a predicted answer and sends this to the ensemble classifier.
    '''
    def get_answer(self,question, use_topic_vectors=True):
        self.lc.ids_answer=json.load(open(os.path.join("train_data","ids_answer.json"),'r'), encoding='utf-8')
        processed_question=self.cpp.preprocessor.transform(question)
        w2v_vector, lstm_vector=self.cpp.get_w2v(processed_question)
        lstm_vector=[lstm_vector]
        padded_vector=pad_sequences(lstm_vector,maxlen=25, dtype='float32',padding='post',truncating='post',value=0.)

        topic_vector=self.tl.get_topic_vector(padded_vector)
        predicted_answer=self.lc.get_prediction(w2v_vector, topic_vector, use_topic_vectors=use_topic_vectors)
        return predicted_answer
