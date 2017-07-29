from copy import copy
from gensim.models.keyedvectors import KeyedVectors
import numpy as np
import pandas as pd
import scipy, time
import itertools, os, string, pickle
from nltk.tokenize import RegexpTokenizer
from nltk import pos_tag
from nltk.util import ngrams
DOT_PROD_METHOD = 'dotproduct'
COSINE_METHOD = 'cos'

        
class VectorModelReducer(object):
    def __init__(self, model, newModel=None, freqDict=None, knownWords=None):
        if newModel is None:
            self._newModel = model.copy(blank=False)
        if knownWords is not None:
            self._knownWords = set(knownWords)
        self._model = model
        #self._newModel = newModel
        self._freqDict = freqDict
        #self._knownWords = knownWords
        self._thesaurus = {}

    def reduceDimModel(self, maxDim=150):
        model = self._model
        newModel = self._newModel
        for w in model:
            newModel.setVector(w, model.getVector(w)[:maxDim])
        self._newModel = newModel
        return newModel
        
    def filterModel(self, freqThresh=0.001, relevanceThresh=0.1):
        """ 
        Filter the model by removing any infrequent words that are irrelevant to
        the space of known words that needed to be matched historically. Known words
        may benefit from a frequency threshold itself if it gets very big, but this
        is not currently done.
        """
        # Filtering down the model
        model = self._model
        freqDict = self._freqDict
        knownWords = self._knownWords
        newModel = self._newModel
        sum_val=0.0
        sum_freq=0.0
        #Returns true if there is a word whose similarity with the word w is >= relevanceThresh.
        def knownWordFilter(w, sum_val):
            val = max(model.compare(w, known) for known in knownWords)
            #print("   %s = %2f"%(w, val))
            sum_val+=val
            return val >= relevanceThresh
        
        def freqFilter(w, sum_freq):
            freq=freqDict.get(w, 0)
            sum_freq+=freq
            return freq >= freqThresh
            
        if freqDict is not None and knownWords is not None:
            aFilter = lambda w: freqFilter(w, sum_freq) or knownWordFilter(w, sum_val)
        elif freqDict is not None:
            aFilter = freqFilter
        elif knownWords is not None:
            aFilter = knownWordFilter
        else:
            aFilter = None
        no_of_words=0
        for w in model:
            no_of_words+=1
            if aFilter is None or aFilter(w):
                newModel.setVector(w, model.getVector(w))
        # Technically redundant, but to remind this is modified in-place
        print("Avg relevance "+str(sum_val/no_of_words))
        print("Avg freq "+str(sum_freq/no_of_words))
        self._newModel = newModel
        return newModel
    
    def clumpModel(self, thresh=0.95):
        """ 
        Thin out model by removing any nearly-identical vectors, done by 
        using one word as a centroid archetype vector used for all other
        words near its position.
        """
        thesaurus = {}
        #thesaurusCounts = {}
        model = self._model
        newModel = self._newModel
        for w in model:
            for w2 in newModel:
                if model.compare(w, w2) > thresh:
                    thesaurus[w2] = w1
                    # Could use this to adjust the centroid to be representative
                    # thesaurusCounts[w1] = thesaurusCounts.get(w1, 0) + 1                    
                else:
                    newModel.setValue(w, model.getVector())
        self._newModel = newModel
        self._thesaurus = thesaurus
        return self._newModel, self._thesaurus
                    
    
class BaseVectorModel(object):
    """ Wrapper for different types of vector models """
    def __iter__(self):
        for k in self.getKeys():
            yield k
    
    def getKeys(self):
        raise NotImplementedError
    
    def getVector(self, w):
        raise NotImplementedError

    def setVector(self, w, vec):
        raise NotImplementedError
    
    def copy(self, blank=False):
        raise NotImplementedError
        
    def compare(self, w1, w2, method=DOT_PROD_METHOD, dims=None):
        # Note: Should use numpy is available
        w1vec = self.getVector(w1)
        w2vec = self.getVector(w2)
        if method == DOT_PROD_METHOD:
            if w1vec is not None and w2vec is not None:
                if dims is None:
                    if len(w1vec) != len(w2vec):
                        raise IndexError("Length of word vector for %s (%i) != %s (%i)"%(w1, len(w1vec), w2, len(w2vec)))
                    dims = len(w1vec)
                try:
                    similarity = np.dot(w1vec, w2vec) #sum([w1vec[i]*w2vec[i] for i in range(0,dims)])
                except IndexError:
                    raise IndexError("Length of word vector for %s (%i) != %s (%i)"%(w1, len(w1vec), w2, len(w2vec)))
                return similarity
            else:
                return 0.0
        elif method == COSINE_METHOD:
            if w1vec is not None and w2vec is not None:
                if dims is None:
                    if len(w1vec) != len(w2vec):
                        raise IndexError("Length of word vector for %s (%i) != %s (%i)"%(w1, len(w1vec), w2, len(w2vec)))
                    dims = len(w1vec)
                try:
                    norm = float([w**2 for w in w1vec])**0.5 + float([w**2 for w in w2vec])**0.5
                    similarity = 1 - scipy.spatial.distance.cosine(w1vec, w2vec) #sum([w1vec[i]*w2vec[i] for i in range(0,dims)])
                except IndexError:
                    raise IndexError("Length of word vector for %s (%i) != %s (%i)"%(w1, len(w1vec), w2, len(w2vec)))
                return similarity
            else:
                return 0.0
        else:
            raise TypeError("No vector model comparison method named: %s"%(method,))
        
class Word2VecModel(BaseVectorModel):
    def __init__(self):
        self._vectorModel=KeyedVectors.load_word2vec_format(os.path.join('..','GoogleNews-vectors-negative300.bin'), binary=True)
    
    def getKeys(self):
        return self._vectorModel.index2word
    
    def getVector(self, w):
        return self._vectorModel[w]

    def setVector(self, w, vec):
        raise NotImplementedError
    
    def copy(self, blank=False):
        if blank == True:
            return self.__class__()
        else:
            return self.__class(copy(self._vectorModel))

    def compare(self, w1, w2, method=DOT_PROD_METHOD, dims=None):
        if method == COSINE_METHOD:
            return self._vectorModel.similarity(w1, w2)
        else:
            raise NotImplementedError

class DictVectorModel(BaseVectorModel):
    def __init__(self, modelDict=None):
        if modelDict is None:
            modelDict = {}
        self._modelDict = modelDict

    def getKeys(self):
        return self._modelDict.keys()
        
    def getVector(self, w):
        return self._modelDict.get(w, None)
        
    def setVector(self, w, vec):
        self._modelDict[w] = vec
        
    def copy(self, blank=False):
        if blank == True:
            return self.__class__()
        else:
            return self.__class__(copy(self._modelDict))

def tokenize(sentence):
    tokenizer=RegexpTokenizer(r'\w+')
    # Break the sentence into n-grams
    def get_ngrams(tokens, n):
        n_grams = ngrams(tokens, n)
        return ['_'.join(grams) for grams in n_grams]

    tokenized_words=[]
    unigrams=tokenizer.tokenize(sentence)
    tokenized_words+=unigrams
    tokenized_words+=get_ngrams(unigrams, 2)
    tokenized_words+=get_ngrams(unigrams, 3)
    return tokenized_words


def exampleTest2():
    known=set()
    corpus=pd.read_csv(os.path.join("data","classifier_data.csv"))
    corpus=corpus.fillna('')
    for i in range(len(corpus)):
        questions=corpus.iloc[i]['question'].split('\r\n')
        answer=corpus.iloc[i]['text']
        for question in questions:
            tokens=tokenize(question)
            known.update(tokens)
    answer_tokens=tokenize(answer)
    known.update(answer_tokens)

    google_model=KeyedVectors.load_word2vec_format(os.path.join('..','GoogleNews-vectors-negative300.bin'), binary=True)
    allWords=google_model.index2word
    #totalCount = len(allWords)*(len(allWords)-1)/2.0
    totalCount = len(allWords)
    freqs={w: google_model.vocab[w].count/totalCount for w in allWords}
    modelData={w: google_model[w] for w in allWords}
    origModel=DictVectorModel(modelData)
    model=origModel
    thesaurus={}
    print(model._modelDict['computer'])
    v1=model._modelDict['computer']
    # Config Values
    maxDim = 4
    freqThresh = 0.04
    knownThresh = 0.8
    clumpThresh = 0.99
    # freqThresh=[10**i for i in range(-7,1)]
    # knownThresh=[0, 0.05, 0.1, 0.15, 0.2]
    # Filtering/Reduction\
    print("Initialized")
    start=time.time()
    filterReducer = VectorModelReducer(model, freqDict=freqs, knownWords=known)
    print("Filtering...")
    filteredModel = filterReducer.filterModel(freqThresh, knownThresh)
    end=time.time()
    elapsed=end-start
    print("Time to filter is "+str(elapsed))
    print(filteredModel._modelDict['computer'])
    v2=filteredModel._modelDict['computer']
    #norm = float([w**2 for w in v1])**0.5 + float([w**2 for w in v2])**0.5
    similarity = 1 - scipy.spatial.distance.cosine(v1, v2)
    print("Similarity is "+str(similarity))
    if not os.path.exists('vector_models'):
        os.mkdir('vector_models')
    model_file='vector_models'+os.sep+'model_'+str(freqThresh)+'_'+str(knownThresh)+'.pkl'
    print("Finished filtering")
    with open(model_file, 'wb') as pickle_file:
        pickle.dump(filteredModel._modelDict, pickle_file)

    #Code for all combinations of freqThresh and knownThresh
    
    # for freq_thresh in freqThresh:
    #     for known_thresh in knownThresh:
    #         filteredModel = filterReducer.filterModel(freqThresh, knownThresh)
    #         model = filteredModel
    #         model_file='vector_models'+os.sep+'model_'+str(freq_thresh)+'_'+str(known_thresh)+'.json'
    #         with open(model_file, 'w') as json_file:
    #             json.dump(model, json_file)

    #clumpReducer = VectorModelReducer(model)
    #clumpedModel, thesaurus = clumpReducer.clumpModel(clumpThresh)
    #model = clumpedModel
  
    return model

#Fake example
def exampleTest():
    # Make some fake test data quickly
    # Model is just a vector of the counts of each letter
    # Frequency is just based on the position
    # Known words are a few real words people say
    base = 'abcd'
    allWords = [''.join(x) for i in range(2, len(base))
                for x in itertools.permutations(base, i)]
    print(allWords)
    known = ['abba', 'abcd', 'bad', 'dab', 'bab', 'ab']

    totalCount = len(allWords)*(len(allWords)-1)/2.0

    freqs = {w : (len(allWords)-i)/totalCount
             for i, w in enumerate(sorted(allWords))
             if i < len(allWords)-3}
    #freqs = None
    #known = None
    print(freqs)
    dimMultiplier = 10
    modelData = {w : [w.count(x)/float(len(w)) for x in base]*dimMultiplier for w in allWords}

    #normalization of the values
    for w, vals in modelData.items():
        norm = float(sum(v**2 for v in vals))**0.5
        modelData[w] = [v/norm for v in vals]
    origModel = DictVectorModel(modelData)
    model = origModel
    thesaurus = {}
    # Config Values
    maxDim = 4
    freqThresh = 0.04
    knownThresh = 0.8
    clumpThresh = 0.99
    # Filtering/Reduction
    #dimReducer = VectorModelReducer(model)
    #lowDimModel = dimReducer.reduceDimModel(maxDim)
    #model = lowDimModel
    filterReducer = VectorModelReducer(model, freqDict=freqs, knownWords=known)
    filteredModel = filterReducer.filterModel(freqThresh, knownThresh)
    model = filteredModel
    #clumpReducer = VectorModelReducer(model)
    #clumpedModel, thesaurus = clumpReducer.clumpModel(clumpThresh)
    #model = clumpedModel
    return model
            
if __name__ == '__main__':
    model = exampleTest2()
