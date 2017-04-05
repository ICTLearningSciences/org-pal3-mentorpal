import string
import csv
from nltk.corpus import stopwords as sw
from nltk.corpus import wordnet as wn
from nltk import wordpunct_tokenize
from nltk import WordNetLemmatizer
from nltk import sent_tokenize
from nltk import pos_tag
from gensim.models.keyedvectors import KeyedVectors
import numpy as np
class NLTKPreprocessor():

    def __init__(self, stopwords=None, punct=None):
        self.stopwords  = stopwords or set(sw.words('english'))
        self.punct      = punct or set(string.punctuation)
        self.lemmatizer = WordNetLemmatizer()

    def inverse_transform(self, X):
        return [" ".join(doc) for doc in X]

    def transform(self, X):
        return [
            list(self.tokenize(doc)) for doc in X
        ]

    def tokenize(self, document):
        # Break the document into sentences
        for sent in sent_tokenize(document):
            # Break the sentence into part of speech tagged tokens
            for token, tag in pos_tag(wordpunct_tokenize(sent)):
                # Apply preprocessing to the token
                token = token.lower()
                token = token.strip()
                # token = token.strip('_') if self.strip else token
                # token = token.strip('*') if self.strip else token

                # If stopword, ignore token and continue
                if token in self.stopwords:
                    continue

                # If punctuation, ignore token and continue
                if all(char in self.punct for char in token):
                    continue

                # Lemmatize the token and yield
                lemma = self.lemmatize(token, tag)
                yield lemma

    def lemmatize(self, token, tag):
        tag = {
            'N': wn.NOUN,
            'V': wn.VERB,
            'R': wn.ADV,
            'J': wn.ADJ
        }.get(tag[0], wn.NOUN)

        return self.lemmatizer.lemmatize(token, tag)



def get_w2v_vector():
    print ""


data=[]
vectors=[]
answer_ids={}
last_id=0
def read_data():
    global data
    with open('../transcripts/full_transcript.csv') as f:
        reader=csv.reader(f)
        for row in reader:
            current_id=None
            answer=row[1]
            if answer not in answer_ids:
                last_id+=1
                answer_ids[answer]=last_id
                current_id=last_id
            else:
                current_id=answer_ids[answer]
            data.append([row[0],current_id])


def get_topic_vector():
    #initialize google news corpus
    model=KeyedVectors.load_word2vec_format('../../GoogleNews-vectors-negative300.bin', binary=True)

    #for each data point, get w2v vector for the question and store in vectors.
    
    for instance in data:
        current_vector=np.zeros(300,dtype=float32)
        question=instance[0]
        for word in question:
            word_vector=np.zeros(300,dtype=float32)
            try:
                word_vector=model[word]
            
    print ""










if __name__=='__main__':
    read_data()
    get_w2v_vector()
    get_topic_vector()
