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

    ''' interface '''
    def load_model(self, mentor):
        if mentor is not self.mentor:
            self.mentor = mentor
            self.w2v_model = KeyedVectors.load_word2vec_format(os.path.join('vector_models','GoogleNews-vectors-negative300-SLIM.bin'), binary = True)

    def train_model(self):
        if self.mentor is None:
            raise Exception('Classifier needs a mentor data model to train on.')
        
        lstm_train_data, train_vectors = self.generate_training_vectors()
        x_train, y_train = self.read_training_data(lstm_train_data)
        train_lstm(lstm_train_data, x_train, y_train)
        # write_data(lstm_train_data, train_vectors)


    def test_model(self, test_size):
        if self.mentor is None:
            raise Exception('Classifier needs a mentor data model to train on.')

        train_data = self.mentor.get_training_data()
        train, test = train_test_split(train_data, test_size=0.2, random_state=42)
        question_predict = get_question_predict_data(test)

    def get_answer(self, question):
        preprocessor = classifier_preprocess.NLTKPreprocessor()
        processed_question = preprocessor.transform(question)
        w2v_vector, lstm_vector = self.get_w2v(processed_question)
        lstm_vector = [lstm_vector]
        padded_vector = pad_sequences(lstm_vector,maxlen = 25, dtype = 'float32',padding = 'post',truncating = 'post',value = 0.)
        topic_vector = self.get_topic_vector(padded_vector)
        predicted_answer = self.get_prediction(w2v_vector, topic_vector, True)
        return predicted_answer



    ''' training '''
    def generate_training_vectors(self):
        train_data = self.mentor.load_training_data()
        train_vectors=[]
        lstm_train_vectors=[]
        lstm_train_data = []

        #for each data point, get w2v vector for the question and store in train_vectors.
        #instance=<question, processed_question, topic, answer_id, answer_text>
        for instance in train_data:
            w2v_vector, lstm_vector=self.get_w2v(instance[1])
            train_vectors.append([instance[0],w2v_vector.tolist(),instance[2],instance[4]])
            lstm_train_vectors.append(lstm_vector)

        #For the LSTM, each training sample will have a max dimension of 300 x 25. For those that don't, the pad_sequences
        #function will pad sequences of [0, 0, 0, 0....] vectors to the end of each sample.
        padded_vectors=pad_sequences(lstm_train_vectors,maxlen=25, dtype='float32',padding='post',truncating='post',value=0.)
        lstm_train_vectors=padded_vectors

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

        return lstm_train_data, train_vectors

    def read_training_data(self, train_data):
        x_train = None
        y_train = None
        x_train=[train_data[i][1] for i in range(len(train_data))] #no of utterances * no_of_sequences * 300
        y_train=[train_data[i][2] for i in range(len(train_data))] #No_of_utterances * no_of_classes (40)
        x_train=np.asarray(x_train)

        return x_train, y_train

    def train_lstm(self, train_data, x_train, y_train):
        new_vectors=[]

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
        filepath=os.path.join("mentors",self.mentor.id,"train_data",'lstm_model')
        checkpoint=ModelCheckpoint(filepath, monitor='val_acc',verbose=1, save_best_only=True, mode='max')
        callbacks_list=[checkpoint]
        hist=topic_model.fit(np.array(x_train), np.array(y_train), batch_size=32, epochs=30, validation_split=0.1, callbacks=callbacks_list, verbose=1)

        topic_model.load_weights(filepath)
        topic_model.compile(loss='categorical_crossentropy',optimizer='adam',metrics=['accuracy'])
        topic_model.save(os.path.join("mentors",self.mentor.id,"train_data","lstm_topic_model.h5"))
        for i in range(0,len(train_data)):
            current_sample=x_train[i][np.newaxis, :, :]
            prediction=topic_model.predict(current_sample)
            new_vectors.append([train_data[i][0],prediction[0].tolist()])

        with open(os.path.join("mentors",self.mentor.id,"train_data","train_topic_vectors.json"),'w') as json_file:
            json.dump(new_vectors, json_file)
            
        self.test_lstm()

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
            return "_OFF_TOPIC_", "_OFF_TOPIC_", highestConfidence
        
        return prediction[0], self.mentor.ids_answer[prediction[0]], highestConfidence
