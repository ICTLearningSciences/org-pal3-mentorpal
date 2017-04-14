import string
import csv
from nltk.tokenize import RegexpTokenizer
from nltk import pos_tag
from nltk.stem import PorterStemmer
from gensim.models.keyedvectors import KeyedVectors
import numpy as np
from keras.models import Sequential
from keras.layers import LSTM, Activation, Dense
from keras.preprocessing.sequence import pad_sequences
import cPickle

train_data=[]
test_data=[]
train_vectors=[]
test_vectors=[]
lstm_train_vectors=[]
lstm_test_vectors=[]
lstm_train_data=[]
lstm_test_data=[]
answer_ids={}
ids_answer={}
all_topics=[]
last_id=0
w2v_model=None
topic_model=None
topic_set=set()
class NLTKPreprocessor(object):

    def __init__(self):
        self.punct      = set(string.punctuation)
        self.stemmer=PorterStemmer()
    def inverse_transform(self, X):
        return [" ".join(doc) for doc in X]

    def transform(self, X):
        return list(self.tokenize(X))

    def tokenize(self, sentence):
        tokenizer=RegexpTokenizer(r'\w+')
        # Break the sentence into part of speech tagged tokens
        tokenized_words=[]
        for token, tag in pos_tag(tokenizer.tokenize(sentence)):
            token = token.lower()
            token = token.strip()

            # If punctuation, ignore token and continue
            if all(char in self.punct for char in token):
                continue

            # Stem the token and yield
            try:
                stemmed_token=self.stemmer.stem(token).encode('utf-8')
            except:
                print "Unicode error. Check the csv source for the following utterance and type it again"
                print token
                print "This utterance: "+sentence
                continue
            yield stemmed_token

def read_topics():
    global all_topics, topic_set
    with open('data/topics.csv') as f:
        reader=csv.reader(f)
        for row in reader:
            all_topics.append(row[0].lower())

def normalize_topics(topics):
    ret_topics=[]
    for topic in topics:
        topic=topic.strip()
        topic=topic.lower()
        ret_topics.append(topic)
        topic_set.add(topic)
    return ret_topics

def read_data():
    global train_data, test_data, last_id, answer_ids, ids_answer
    preprocessor=NLTKPreprocessor()
    with open('data/Full_Dataset - Sheet1.csv','rU') as f:
        reader=csv.reader(f)
        #row=<question, topic, answer, paraphrases>
        reader.next() #skip header
        for row in reader:
            current_id=None
            topics=row[0].split(",")
            helpers=row[1].split(",")
            question=row[2]
            answer=row[3]
            paraphrases=row[4:]
            paraphrases=filter(None, paraphrases)

            #Tokenize the question
            question=preprocessor.transform(question)
            topics=topics+helpers
            topics=filter(None, topics)
            #normalize the topics
            topics=normalize_topics(topics)

            if answer not in answer_ids:
                last_id+=1
                answer_ids[answer]=last_id
                ids_answer[last_id]=answer
                current_id=last_id
            else:
                current_id=answer_ids[answer]
            #add question to dataset
            train_data.append([question,topics,current_id])

            # #add questions to test_data
            # if len(paraphrases) == 3:
            #     test_data.append([paraphrases.pop(-1),current_id])
            # elif len(paraphrases) > 3 and len(paraphrases) <= 6:
            #     test_data.append([paraphrases.pop(-1),current_id])
            #     test_data.append([paraphrases.pop(-1),current_id])
            # elif len(paraphrases) > 6:
            #     test_data.append([paraphrases.pop(-1),current_id])
            #     test_data.append([paraphrases.pop(-1),current_id])
            #     test_data.append([paraphrases.pop(-1),current_id])

            #look for paraphrases and add them to dataset
            for i in range(0,len(paraphrases)):
                paraphrases[i]=preprocessor.transform(paraphrases[i])
                if len(paraphrases) == 3 and len(paraphrases) - i == 1:
                    test_data.append([paraphrases[i],topics,current_id])
                elif len(paraphrases) > 3 and len(paraphrases) <= 6 and len(paraphrases)-i <=2:
                    test_data.append([paraphrases[i],topics,current_id])
                elif len(paraphrases) > 6 and len(paraphrases)-i <=3:
                    test_data.append([paraphrases[i],topics,current_id])
                else:
                    train_data.append([paraphrases[i],topics,current_id])

def get_w2v(question):
    current_vector=np.zeros(300,dtype='float32')
    lstm_vector=[]
    for word in question:
        try:
            word_vector=w2v_model[word]
        except:
            word_vector=np.zeros(300,dtype='float32')
        lstm_vector.append(word_vector)
        current_vector+=word_vector
    return current_vector, lstm_vector

def generate_training_vectors():
    global train_vectors, test_vectors, lstm_train_vectors, lstm_test_vectors
    #for each data point, get w2v vector for the question and store in train_vectors.
    #instance=<question, topic, answer, paraphrases>
    for instance in train_data:
        w2v_vector, lstm_vector=get_w2v(instance[0])
        train_vectors.append([w2v_vector,instance[1],instance[2]])
        lstm_train_vectors.append(lstm_vector)
    padded_vectors=pad_sequences(lstm_train_vectors,maxlen=25, dtype='float32',padding='post',truncating='post',value=0.)
    lstm_train_vectors=padded_vectors

    for instance in test_data:
        w2v_vector, lstm_vector=get_w2v(instance[0])
        #print instance
        test_vectors.append([w2v_vector,instance[1],instance[2]])
        lstm_test_vectors.append(lstm_vector)
    padded_vectors=pad_sequences(lstm_test_vectors,maxlen=25, dtype='float32',padding='post',truncating='post',value=0.)
    lstm_test_vectors=padded_vectors

def generate_sparse_topic_vectors():
    #Generate the sparse topic train_vectors
    for i in range(len(train_vectors)):
        vector=train_vectors[i][0]
        current_topics=train_vectors[i][1]
        topic_vector=[0]*len(all_topics)
        for j in range(len(all_topics)):
            if all_topics[j] in current_topics:
                topic_vector[j]=1
        train_vectors[i][1]=topic_vector
        lstm_train_data.append([lstm_train_vectors[i],topic_vector])

    #Generate the sparse topic test_vectors
    for i in range(len(test_vectors)):
        vector=test_vectors[i][0]
        current_topics=test_vectors[i][1]
        topic_vector=[0]*len(all_topics)
        for j in range(len(all_topics)):
            if all_topics[j] in current_topics:
                topic_vector[j]=1
        test_vectors[i][1]=topic_vector
        lstm_test_data.append([lstm_test_vectors[i],topic_vector])

def write_data():
    #dump lstm_train_data
    with open('lstm_train_data.pickle','wb') as pickle_file:
        cPickle.dump(lstm_train_data, pickle_file)
    #dump lstm_test_data
    with open('lstm_test_data.pickle','wb') as pickle_file:
        cPickle.dump(lstm_test_data, pickle_file)
    #dump train_vectors for logistic regression
    with open('lr_train_data.pickle','wb') as pickle_file:
        cPickle.dump(train_vectors,pickle_file)
    #dump test_vectors for logistic regression
    with open('lr_test_data.pickle','wb') as pickle_file:
        cPickle.dump(test_vectors,pickle_file)
    #dump ids_answers
    with open('ids_answer.pickle','wb') as pickle_file:
        cPickle.dump(ids_answer,pickle_file)


if __name__=='__main__':
    print "Reading topics..."
    read_topics()
    print "Reading data..."
    read_data()
    print "Generate w2v vectors..."
    w2v_model=KeyedVectors.load_word2vec_format('../GoogleNews-vectors-negative300.bin', binary=True)
    generate_training_vectors()
    generate_sparse_topic_vectors()
    print "write data..."
    write_data()
