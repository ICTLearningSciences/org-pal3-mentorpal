import os

from gensim.models.keyedvectors import KeyedVectors
import numpy as np

class W2V(object):
    def __init__(self, w2v_file_name="GoogleNews-vectors-negative300-SLIM.bin"):
        self.__w2v_file_name = w2v_file_name
        self.__w2v_path = os.path.join("checkpoint","vector_models",self.__w2v_file_name)
        self.__w2v_model = KeyedVectors.load_word2vec_format(self.__w2v_path, binary = True)


    def get_w2v_file_name(self):
        return self.__w2v_file_name
        

    def w2v_for_question(self, question):
        current_vector = np.zeros(300, dtype='float32')
        lstm_vector = []
        for word in question:
            try:
                word_vector = self.__w2v_model[word]
            except:
                word_vector = np.zeros(300,dtype = 'float32')
            lstm_vector.append(word_vector)
            current_vector += word_vector
        return current_vector, lstm_vector