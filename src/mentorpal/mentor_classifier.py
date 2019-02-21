import os
import numpy as np

from sklearn.externals import joblib
from gensim.models.keyedvectors import KeyedVectors
from keras.preprocessing.sequence import pad_sequences
from sklearn.linear_model import RidgeClassifier

from mentorpal import classifier_preprocess
from mentorpal.iclassifier import IClassifier
from mentorpal.mentor import Mentor

class MentorClassifier(IClassifier):
    WORD2VEC_DEFAULT_PATH = os.path.join('vector_models','GoogleNews-vectors-negative300-SLIM.bin')
    LOGISTIC_MODEL_DEFAULT_PATH = os.path.join("train_data","fused_model.pkl")

    def __init__(self, mentor, word2vec = WORD2VEC_DEFAULT_PATH, logmodel = LOGISTIC_MODEL_DEFAULT_PATH):
        """
        Create a classifier instance for a mentor

        Args:
            word2vec: (string|gensim.models.keyedvectors.KeyedVectors)
                The word-to-vector model or path to it
            logmodel: (string)
                The logistic model or path to it

            mentor: (string|Mentor) a mentor instance or the id for a mentor to load
        """
        self.mentor = mentor

        if isinstance(mentor, str):
            print('loading mentor id {}...'.format(mentor))
            self.mentor = Mentor(mentor)

        assert isinstance(self.mentor, Mentor), \
            'invalid type for mentor (expected mentor.Mentor or string id for a mentor, encountered {}'.format(type(mentor))
         
        if isinstance(word2vec, str):
            print('loading word2vec from path {}...'.format(word2vec))
            word2vec = KeyedVectors.load_word2vec_format(word2vec, binary = True)

        assert isinstance(word2vec, KeyedVectors), \
            'invalid type for word2vec (expected gensim.models.keyedvectors.KeyedVectors or path to binary, encountered {}'.format(type(word2vec))

        if isinstance(logmodel, str):
            path = os.path.join("mentors", self.mentor.id, logmodel)
            print('loading logistic model from path {}...'.format(path))
            logmodel = joblib.load(path)

        assert isinstance(logmodel, RidgeClassifier), \
            'invalid type for logmodel (expected sklearn.linear_model.ridge.RidgeClassifier or path to binary, encountered {}'.format(type(logmodel))

        self.w2v_model = word2vec
        self.logistic_model = logmodel

    def get_answer(self, question):
        preprocessor = classifier_preprocess.NLTKPreprocessor()
        processed_question = preprocessor.transform(question)
        w2v_vector, lstm_vector = self.get_w2v(processed_question)
        lstm_vector = [lstm_vector]
        padded_vector = pad_sequences(lstm_vector,maxlen = 25, dtype = 'float32',padding = 'post',truncating = 'post',value = 0.)
        topic_vector = self.get_topic_vector(padded_vector)
        predicted_answer = self.get_prediction(w2v_vector, topic_vector)
        return predicted_answer

    ''' answer prediction '''
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

    def get_prediction(self, w2v_vector, topic_vector):
        test_vector = np.concatenate((w2v_vector, topic_vector))
        test_vector = test_vector.reshape(1,-1)
        prediction = self.logistic_model.predict(test_vector)
        highestConfidence = sorted(self.logistic_model.decision_function(test_vector)[0])[self.logistic_model.decision_function(test_vector).size-1]
        
        if highestConfidence < -0.88:
            return "_OFF_TOPIC_", "_OFF_TOPIC_", highestConfidence
        
        return prediction[0], self.mentor.ids_answers[prediction[0]], highestConfidence
