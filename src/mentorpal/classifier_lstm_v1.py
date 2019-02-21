import os
import numpy as np

from keras.models import load_model
from sklearn.externals import joblib
from gensim.models.keyedvectors import KeyedVectors
from keras.preprocessing.sequence import pad_sequences
from sklearn.linear_model import RidgeClassifier

from mentorpal.nltk_preprocessor import NLTKPreprocessor
from mentorpal.iclassifier import IClassifier
from mentorpal.mentor import Mentor

class LSTMClassifier(IClassifier):
    WORD2VEC_DEFAULT_PATH = os.path.join('vector_models','GoogleNews-vectors-negative300-SLIM.bin')
    MODEL_DEFAULT_PATH = os.path.join('checkpoint','classifiers','lstm_v1','{0}')

    '''
    Create a classifier instance for a mentor

    Args:
        mentor: (string|Mentor)
            A mentor instance or the id for a mentor to load
        word2vec: (string|gensim.models.keyedvectors.KeyedVectors)
            The word-to-vector model or path to it
        model: (string)
            The path to the classifier model to use
    '''
    def __init__(self, mentor, word2vec = WORD2VEC_DEFAULT_PATH, model_path = MODEL_DEFAULT_PATH):
        self.mentor = mentor

        if isinstance(mentor, str):
            print('loading mentor id {}...'.format(mentor))
            mentor = Mentor(mentor)

        assert isinstance(mentor, Mentor), \
            'invalid type for mentor (expected mentor.Mentor or string id for a mentor, encountered {}'.format(type(mentor))
         
        if isinstance(word2vec, str):
            print('loading word2vec from path {}...'.format(word2vec))
            word2vec = KeyedVectors.load_word2vec_format(word2vec, binary = True)

        assert isinstance(word2vec, KeyedVectors), \
            'invalid type for word2vec (expected gensim.models.keyedvectors.KeyedVectors or path to binary, encountered {}'.format(type(word2vec))

        logistic_model = None
        topic_model = None

        if isinstance(model_path, str):
            model_path = model_path.format(mentor.id)
            print('loading model from path {}...'.format(model_path))

            if not os.path.exists(model_path):
                print('model does not exist at given path. classifier will need to be trained before asking questions.')
                print('creating model directory...')
                os.makedirs(model_path)
            else:
                try:
                    topic_model = load_model(os.path.join(model_path, 'lstm_topic_model.h5'))
                    logistic_model = joblib.load(os.path.join(model_path, 'fused_model.pkl'))
                except:
                    print('unable to load model. classifier will need to be trained before asking questions.')

        self.mentor = mentor
        self.w2v_model = word2vec
        self.model_path = model_path
        self.logistic_model = logistic_model
        self.topic_model = topic_model

    def get_answer(self, question):
        preprocessor = NLTKPreprocessor()
        processed_question = preprocessor.transform(question)
        w2v_vector, lstm_vector = self.__get_w2v(processed_question)
        lstm_vector = [lstm_vector]
        padded_vector = pad_sequences(lstm_vector,maxlen = 25, dtype = 'float32',padding = 'post',truncating = 'post',value = 0.)
        topic_vector = self.__get_topic_vector(padded_vector)
        predicted_answer = self.__get_prediction(w2v_vector, topic_vector)
        return predicted_answer

    def __get_w2v(self, question):
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
    
    def __get_topic_vector(self, lstm_vector):
        if self.topic_model is None:
            try:
                self.topic_model = load_model(os.path.join(self.model_path, 'lstm_topic_model.h5'))
            except:
                print('could not find topic model for {0}. please train classifier first'.format(self.mentor.id))

        predicted_vector = self.topic_model.predict(lstm_vector)
        return predicted_vector[0]

    def __get_prediction(self, w2v_vector, topic_vector):
        if self.logistic_model is None:
            try:
                self.logistic_model = joblib.load(os.path.join(self.model_path, 'fused_model.pkl'))
            except:
                print('could not find logistic model for {0}. please train classifier first'.format(self.mentor.id))
    
        test_vector = np.concatenate((w2v_vector, topic_vector))
        test_vector = test_vector.reshape(1,-1)
        prediction = self.logistic_model.predict(test_vector)
        highestConfidence = sorted(self.logistic_model.decision_function(test_vector)[0])[self.logistic_model.decision_function(test_vector).size-1]
        
        if highestConfidence < -0.88:
            return "_OFF_TOPIC_", "_OFF_TOPIC_", highestConfidence
        
        return self.mentor.answer_ids[prediction[0]], prediction[0], highestConfidence
