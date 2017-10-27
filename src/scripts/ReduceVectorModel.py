from copy import copy
from gensim.models.keyedvectors import KeyedVectors
from gensim.models import Word2Vec
import numpy as np
import pandas as pd
import scipy, time
import itertools, os, string, pickle
from nltk.tokenize import RegexpTokenizer
from nltk import pos_tag
from nltk.util import ngrams
import operator
DOT_PROD_METHOD = 'dotproduct'
COSINE_METHOD = 'cos'

		
class VectorModelReducer(object):
	def __init__(self, model, newModel=None, freqDict=None, knownWords=None, knownCorpus=None):
		if newModel is None:
			self._newModel = model.copy(blank=True)
		if knownWords is not None:
			self._knownWords = set(knownWords)
		self._model = model
		#self._newModel = newModel
		self._freqDict = freqDict
		self.relevanceDict = {} #for sorting by relevance to check effectiveness
		self._knownWords = knownWords
		self._knownCorous = knownCorpus
		self._thesaurus = {}
		self.sum_val = 0.0
		self.sum_freq = 0.0
		self.no_of_words = 0
		self.words_to_cosine_thresh = {}

	def reduceDimModel(self, maxDim=150):
		for w in self._newModel:
			self._newModel.setVector(w, newModel.getVector(w)[:maxDim])
		return self._newModel
		
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
		relevanceDict = self.relevanceDict
		#sum_val=0.0
		sum_freq=0.0

		#Returns true if w is more relevant to a word in our corpus than our threshold
		def knownWordFilter(self, w, relevanceDict):
			#get max similarity from gensim
			val = max(model.compare(w, known) for known in knownWords)
			relevanceDict[w] = val 
			#print("relevance of '" + w + "' is: " + str(val))
			#print("   %s = %2f"%(w, val))
			self.sum_val += val
			return val >= relevanceThresh
	
		def freqFilter(self, w):
			freq = freqDict.get(w, 0)
			self.sum_freq+=freq
			return freq >= freqThresh
			
		if freqDict is not None and knownWords is not None:
			aFilter = lambda w: freqFilter(self, w) or knownWordFilter(self, w, relevanceDict)
		elif freqDict is not None:
			aFilter = freqFilter
		elif knownWords is not None:
			aFilter = knownWordFilter
		else:
			print("freqDict and knownWords DNE!!!")
			aFilter = None

		#HERE THE FILTERING HAPPENS
		count = 0
		for w in model:
			self.no_of_words += 1

			if aFilter is None or aFilter(w):
				newModel.setVector(w, model.getVector(w))
			else:
				newModel.removeVector(w)

		'''
		#sort relevanceDict in list of tuples (word, relevance value)
		sorted_relevance = sorted(self.relevanceDict.items(), key=operator.itemgetter(1), reverse=True)


		#store values at 10,000 up to 3,000,000 with increments of 10,000
		no_words_to_cosine_thresh = {}
		for x in range (0, 2750001):
			#store threshold for each group of 10000 words
			if len(sorted_relevance) <= x:
				#make sure we aren't past the end of the list and break so we still save data
				print("Index of sort_relevance was OUTOFBOUNDS at " + str(x))
				break
			no_words_to_cosine_thresh[x] = sorted_relevance[x]

		#convert back to list to save
		sorted_words_to_cosine_thresh = sorted(no_words_to_cosine_thresh.items(), key=operator.itemgetter(0))
		#save to CSV
		frame = pd.DataFrame(sorted_words_to_cosine_thresh, columns=["Number of words", "Cosine Threshold"])
		frame.to_csv("../count_words_to_cosine_thresh.csv", index=None)
		'''

		#HELPFUL STATISTICS
		totalFreq = 0.0
		for key, value in freqDict.items():
			totalFreq += value
		print("no_of_words: " + str(self.no_of_words))
		print("Avg relevance "+str(self.sum_val/self.no_of_words))
		print("Avg freq "+str(self.sum_freq/self.no_of_words))
		print("Avg freq with totalFreq "+str(totalFreq/self.no_of_words))
		print("Sum of frequencies: " + str(self.sum_freq))
		self._newModel = newModel
		
		return self._newModel
	
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
		
	def compare(self, w1, w2, method=COSINE_METHOD, dims=None):
		# using numpy for dot and cosine
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
					#norm = float([w**2 for w in w1vec])**0.5 + float([w**2 for w in w2vec])**0.5
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
		self._vectorModel=Word2Vec.load(os.path.join('..','GoogleNews-vectors-negative300.bin'), binary=True)
		print("similarity: " + str(self._vectorModel.similarity('france', 'spain')))
		print("Count: " + str(self._vectorModel.count))
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

	def removeVector(self, w):
		self._modelDict[w] = None
		
	def copy(self, blank=False):
		if blank == True:
			return self.__class__()
		else:
			return self.__class__(copy(self._modelDict))

	def getLength(self):
		return len(self._modelDict)

def tokenize(sentence):
	tokenizer=RegexpTokenizer(r'\w+')
	def get_ngrams(tokens, n):
		n_grams = ngrams(tokens, n)
		return ['_'.join(grams) for grams in n_grams]

	tokenized_words=[]
	unigrams=tokenizer.tokenize(sentence)
	tokenized_words+=unigrams
	tokenized_words+=get_ngrams(unigrams, 2)
	tokenized_words+=get_ngrams(unigrams, 3)
	return tokenized_words

''' Given a word2vec model and a desired word_count, return a new model 
reduced to the first (word_count) words in the given model '''
def filterByIndex(model, word_count):
	#implement later to allow this to word for any model if necessary
	return; 

''' taking in a vocab object and model size, return the frequency
calculated using Zipf's law. this frequency is also a probability '''
def zipfWordFrequency(vocab_obj, words_in_model):
	index = vocab_obj.index
	frequencyConstant = np.log(words_in_model) - np.log(1)
	frequency = 1/frequencyConstant/(index + 1)
	return frequency

def exampleTest():
	#set up corpus from classifier data file
	known=set()
	corpus=pd.read_csv(os.path.join("data","classifier_data.csv"))
	corpus=corpus.fillna('') #eliminates all NaN boxed from spreadsheet
	for i in range(len(corpus)):
		questions=corpus.iloc[i]['question'].split('\r\n')
		answer=corpus.iloc[i]['text']
		for question in questions:
			tokens=tokenize(question)
			known.update(tokens)
	answer_tokens=tokenize(answer)
	known.update(answer_tokens)
	# corpus_model=Word2Vec([known], min_count=1)
	# print(str(corpus_model.most_similar(positive=['navy'],topn=5)))
	# word_vectors = corpus_model.wv
	# print(str(word_vectors.most_similar(positive=['navy'],topn=5)))


	google_model=KeyedVectors.load_word2vec_format(os.path.join('..','GoogleNews-vectors-negative300.bin'), binary=True)
	allWords=google_model.index2word
	modelData={w: google_model[w] for w in allWords}
	origModel=DictVectorModel(modelData)

	
	#google_model=KeyedVectors.load_word2vec_format(os.path.join('..','GoogleNews-vectors-negative300.bin'), binary=True)
	vocab_obj = google_model.vocab["word"]
	print("count of word in keyed: " + str(vocab_obj.count))
	print("index of word in keyed: " + str(vocab_obj.index))
	allWords=google_model.index2word
	print("First word: " + str(allWords[1]))
	#totalCount = len(allWords)*(len(allWords)-1)/2.0
	totalCount = len(allWords)
	print("total words from totalCount: " + str(totalCount))
	#print(str(allWords))



	#create a pandas DataFrame with columns labeled
	# list_ = []

	# limit_array_length = 0
	# for w in google_model.index2word:
	# 	if limit_array_length <= 1000:
	# 		list_.append(w)
	# 		limit_array_length += 1
	# 	#print("w in google model " + str(w))
	# frame = pd.DataFrame(np.reshape(np.array(list_),-1), columns=["Word"])
	# frame = frame.drop_duplicates(['Word'],keep="first")
	# frame.to_csv("../first_words.csv", index=None)


	limit_array_length = 0

	freqs={w: zipfWordFrequency(google_model.vocab[w],totalCount) for w in allWords}
	modelData={w: google_model[w] for w in allWords}
	origModel=DictVectorModel(modelData)
	model=origModel
	thesaurus={}
	#print(model._modelDict['computer'])
	#v1=model._modelDict['the'] #for later comparison with reduced dict

	# Config Values
	maxDim = 4
	''' FREQUENCY for word counts with Google news vector(3 million words)
	calculated using FrequencyMetrics.py
	25000 words: 2.6820216255e-06
	50000 words: 1.34101081275e-06
	100000 words: 6.70505406374e-07
	150000 words: 4.4700360425e-07
	200000 words: 3.35252703187e-07
	250000 words: 2.6820216255e-07
	500000 words: 1.34101081275e-07
	750000 words: 8.94007208499e-08
	1000000 words: 6.70505406374e-08
	1250000 words: 5.364043251e-08
	1500000 words: 4.4700360425e-08
	1750000 words: 3.831459465e-08
	2000000 words: 3.35252703187e-08
	2250000 words: 2.98002402833e-08
	2500000 words: 2.6820216255e-08
	2750000 words: 2.43820147773e-08
	3000000 words: 2.23501802125e-08
	'''
	#250000 words by freq thresh
	freqThresh = 2.6820216255e-07
	#just below 300000 words by rel thresh
	knownThresh = 1 #currently using cosine, avg relevance with dot is ??? 2.27510558315
	#clumpThresh = 0.99 #not yet implemented

	print("Initialized")
	start=time.time()
	filterReducer = VectorModelReducer(model, freqDict=freqs, knownWords=known)
	print("Filtering...")

	filteredModel = filterReducer.filterModel(freqThresh, knownThresh)
	#reduceDimModel = filterReducer.reduceDimModel(filterModel)
	end=time.time()
	elapsed=end-start
	print("Time to filter is "+str(elapsed))
	#print(filteredModel._modelDict['computer'])

	#v2=filteredModel._modelDict['the']
	#norm = float([w**2 for w in v1])**0.5 + float([w**2 for w in v2])**0.5
	#similarity = 1 - scipy.spatial.distance.cosine(v1, v2)
	#print("Similarity is "+str(similarity))

	if not os.path.exists('vector_models'):
		os.mkdir('vector_models')
	model_file='vector_models'+os.sep+'model_'+str(freqThresh)+'_'+str(knownThresh)+'.pkl'

		
	start=time.time()
	print("Dumping...")
	pickle_dump(filteredModel._modelDict, model_file)
	end=time.time()
	elapsed=end-start
	print("Time to dump is " + str(elapsed))
	print("Finished filtering, length of new model: " + str(filteredModel.getLength()))

	#with open(model_file, 'wb') as pickle_file:
	#	pickle.dump(filteredModel._modelDict, pickle_file)
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

#https://stackoverflow.com/questions/31468117/python-3-can-pickle-handle-byte-objects-larger-than-4gb
class MacOSFile(object):

	def __init__(self, f):
		self.f = f

	def __getattr__(self, item):
		return getattr(self.f, item)

	def read(self, n):
		# print("reading total_bytes=%s" % n, flush=True)
		if n >= (1 << 31):
			buffer = bytearray(n)
			idx = 0
			while idx < n:
				batch_size = min(n - idx, 1 << 31 - 1)
				# print("reading bytes [%s,%s)..." % (idx, idx + batch_size), end="", flush=True)
				buffer[idx:idx + batch_size] = self.f.read(batch_size)
				# print("done.", flush=True)
				idx += batch_size
			return buffer
		return self.f.read(n)

	def write(self, buffer):
		n = len(buffer)
		print("writing total_bytes=%s..." % n, flush=True)
		idx = 0
		while idx < n:
			batch_size = min(n - idx, 1 << 31 - 1)
			print("writing bytes [%s, %s)... " % (idx, idx + batch_size), end="", flush=True)
			self.f.write(buffer[idx:idx + batch_size])
			print("done.", flush=True)
			idx += batch_size


def pickle_dump(obj, file_path):
	with open(file_path, "wb") as f:
		return pickle.dump(obj, MacOSFile(f), protocol=pickle.HIGHEST_PROTOCOL)


def pickle_load(file_path):
	with open(file_path, "rb") as f:
		return pickle.load(MacOSFile(f))
			
if __name__ == '__main__':
	model = exampleTest()
