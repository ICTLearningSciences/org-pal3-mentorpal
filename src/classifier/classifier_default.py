import os
import numpy as np
import classifier_preprocess
import mentor

from iclassifier import IClassifier
from sklearn.externals import joblib
from sklearn.model_selection import train_test_split
from sklearn.model_selection import cross_val_score
from gensim.models.keyedvectors import KeyedVectors
from keras.preprocessing.sequence import pad_sequences

class Classifier(IClassifier):
    def __init__(self):
        self.mentor = None
        self.w2v_model = None

    def load_model(self, mentor):
        if mentor is not self.mentor:
            self.mentor = mentor
            self.w2v_model = KeyedVectors.load_word2vec_format(os.path.join('vector_models','GoogleNews-vectors-negative300-SLIM.bin'), binary = True)

    def train_model(self):
        if self.mentor is None:
            raise Exception('Classifier needs a mentor data model to train on.')
        
        pass

    def get_answer(self, question):
        preprocessor = classifier_preprocess.NLTKPreprocessor()
        processed_question = preprocessor.transform(question)
        w2v_vector, lstm_vector = self.get_w2v(processed_question)
        lstm_vector = [lstm_vector]
        padded_vector = pad_sequences(lstm_vector,maxlen = 25, dtype = 'float32',padding = 'post',truncating = 'post',value = 0.)
        topic_vector = self.get_topic_vector(padded_vector)
        predicted_answer = self.get_prediction(w2v_vector, topic_vector, True)
        return predicted_answer


    def get_w2v(self, question):
        current_vector = np.zeros(300,dtype = 'float32')
        lstm_vector = []
        for word in question:
            try:
                word_vector = self.w2v_model[word]
            except:
                word_vector = np.zeros(300,dtype = 'float32')
            lstm_vector.append(word_vector)
            current_vector += word_vector
        return current_vector, lstm_vector
    
    def get_topic_vector(self, lstm_vector):
        topic_model = self.mentor.load_topic_model()
        predicted_vector = topic_model.predict(lstm_vector)
        return predicted_vector[0]

    def get_prediction(self, w2v_vector, topic_vector, use_topic_vectors = True):
        method = 'fused'
        if not use_topic_vectors:
            method = 'unfused'
        logistic_model = joblib.load(os.path.join("mentors",self.mentor.id,"train_data",method+"_model.pkl"))

        if not use_topic_vectors:
            test_vector = w2v_vector
        else:
            test_vector = np.concatenate((w2v_vector, topic_vector))

        test_vector = test_vector.reshape(1,-1)
        prediction = logistic_model.predict(test_vector)
        highestConfidence = sorted(logistic_model.decision_function(test_vector)[0])[logistic_model.decision_function(test_vector).size-1]
        
        if highestConfidence < -0.88:
            return "_OFF_TOPIC_", highestConfidence
        
        return prediction[0], highestConfidence
