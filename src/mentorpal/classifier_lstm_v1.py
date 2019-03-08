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
    CLASSIFIER_NAME = "lstm_v1"
    if 'CHECKPOINT' in os.environ:
        DEFAULT_CHECKPOINT = os.environ['CHECKPOINT']
    else:
        DEFAULT_CHECKPOINT = '2019-2-21-220'

    '''
    Create a classifier instance for a mentor

    Args:
        mentor: (string|Mentor)
            A mentor instance or the id for a mentor to load
        checkpoint: (string)
            The dated version path of the classifier model checkpoint to use
    '''
    def __init__(self, mentor, checkpoint = DEFAULT_CHECKPOINT):
        if isinstance(mentor, str):
            print('loading mentor id {}...'.format(mentor))
            mentor = Mentor(mentor)

        assert isinstance(mentor, Mentor), \
            'invalid type for mentor (expected mentor.Mentor or string id for a mentor, encountered {}'.format(type(mentor))
         
        self.mentor = mentor
        self.checkpoint = checkpoint
        self.name = LSTMClassifier.CLASSIFIER_NAME

        model_path = self.get_model_path()
        self.logistic_model, self.topic_model, self.w2v_model = self.__load_model(model_path)

    def get_answer(self, question):
        preprocessor = NLTKPreprocessor()
        processed_question = preprocessor.transform(question)
        w2v_vector, lstm_vector = self.__get_w2v(processed_question)
        lstm_vector = [lstm_vector]
        padded_vector = pad_sequences(lstm_vector,maxlen = 25, dtype = 'float32',padding = 'post',truncating = 'post',value = 0.)
        topic_vector = self.__get_topic_vector(padded_vector)
        predicted_answer = self.__get_prediction(w2v_vector, topic_vector)
        return predicted_answer

    def get_model_path(self):
        return os.path.join("checkpoint","classifiers","{0}","{1}","{2}").format(self.name, self.checkpoint, self.mentor.id)

    def __load_model(self, model_path):
        logistic_model = None
        topic_model = None
        word2vec = None

        print('loading model from path {}...'.format(model_path))
        if not os.path.exists(model_path) or not os.listdir(model_path):
            print('Local checkpoint {0} does not exist.'.format(model_path))
            print('Download checkpoint from webdisk using:')
            print('make download-checkpoint classifier={0} checkpoint={1}'.format(self.name, self.checkpoint))
        
        try:
            path = os.path.join(model_path, 'lstm_topic_model.h5')
            topic_model = load_model(path)
        except:
            print('Unable to load topic model from {0}. Classifier needs to be retrained before asking questions.'.format(path))
        try:
            path = os.path.join(model_path, 'fused_model.pkl')
            logistic_model = joblib.load(path)
        except:
            print('Unable to load logistic model from {0}. Classifier needs to be retrained before asking questions.'.format(path))
        try:
            path = os.path.join(model_path, 'w2v.txt')
            with open(path, 'r') as myfile:
                word2vec = myfile.read().replace('\n', '')
                word2vec = os.path.join("checkpoint","vector_models","{0}").format(word2vec)
                word2vec = KeyedVectors.load_word2vec_format(word2vec, binary = True)
        except:
            print('Unable to load word2vec model from {0}. Will use default slim version.'.format(path))
            word2vec = os.path.join("checkpoint","vector_models","GoogleNews-vectors-negative300-SLIM.bin")
            word2vec = KeyedVectors.load_word2vec_format(word2vec, binary = True)

        assert isinstance(word2vec, KeyedVectors), \
            'invalid type for word2vec (expected gensim.models.keyedvectors.KeyedVectors or path to binary, encountered {}'.format(type(word2vec))

        return logistic_model, topic_model, word2vec

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
        model_path = self.get_model_path()
        if self.topic_model is None:
            try:
                self.topic_model = load_model(os.path.join(model_path, 'lstm_topic_model.h5'))
            except:
                raise Exception('Could not find topic model under {0}. Please train classifier first.'.format(model_path))

        predicted_vector = self.topic_model.predict(lstm_vector)
        return predicted_vector[0]

    def __get_prediction(self, w2v_vector, topic_vector):
        model_path = self.get_model_path()
        if self.logistic_model is None:
            try:
                self.logistic_model = joblib.load(os.path.join(model_path, 'fused_model.pkl'))
            except:
                raise Exception('Could not find logistic model under {0}. Please train classifier first.'.format(model_path))
    
        test_vector = np.concatenate((w2v_vector, topic_vector))
        test_vector = test_vector.reshape(1,-1)
        prediction = self.logistic_model.predict(test_vector)
        highestConfidence = sorted(self.logistic_model.decision_function(test_vector)[0])[self.logistic_model.decision_function(test_vector).size-1]
        
        if highestConfidence < -0.88:
            return "_OFF_TOPIC_", "_OFF_TOPIC_", highestConfidence
        
        return self.mentor.answer_ids[prediction[0]], prediction[0], highestConfidence
