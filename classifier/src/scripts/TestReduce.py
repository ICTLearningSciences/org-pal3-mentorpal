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


if __name__ == '__main__':
	def exampleTest2():
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

	google_model=KeyedVectors.load_word2vec_format(os.path.join('..','GoogleNews-vectors-negative300.bin'), binary=True)
	allWords=google_model.index2word
	#totalCount = len(allWords)*(len(allWords)-1)/2.0
	totalCount = len(allWords)
	print("total words from totalCount: " + str(totalCount))


	#create a pandas DataFrame with columns labeled
	list_ = []

	limit_array_length = 0
	for w in google_model.vocab:
		if limit_array_length <= 1000:
			list_.append(w)
			limit_array_length += 1
		#print("w in google model " + str(w))
	frame = pd.DataFrame(np.reshape(np.array(list_),-1), columns=["Word"])
	#frame = frame.drop_duplicates(['Word'],keep="first")
	frame.to_csv("../first_words.csv", index=None)

	freqs={w: google_model.vocab[w].count/totalCount for w in allWords}
	modelData={w: google_model[w] for w in allWords}
	origModel=DictVectorModel(modelData)
	model=origModel
	thesaurus={}
	#print(model._modelDict['computer'])
	v1=model._modelDict['computer'] #for later comparison with reduced dict

	# Config Values
	maxDim = 4
	freqThresh = 0.9 #avg freq is 0.5000001666666735
	knownThresh = 0.00002 #avg relevance 1.02122755249e-05
	clumpThresh = 0.99

	print("Initialized")
	start=time.time()
	filterReducer = VectorModelReducer(model, freqDict=freqs, knownWords=known)
	print("Filtering...")

	filteredModel = filterReducer.filterModel(freqThresh, knownThresh)
	end=time.time()
	elapsed=end-start
	print("Time to filter is "+str(elapsed))
	#print(filteredModel._modelDict['computer'])

	v2=filteredModel._modelDict['computer']
	#norm = float([w**2 for w in v1])**0.5 + float([w**2 for w in v2])**0.5
	similarity = 1 - scipy.spatial.distance.cosine(v1, v2)
	print("Similarity is "+str(similarity))
	print("Finished filtering")

	if not os.path.exists('vector_models'):
		os.mkdir('vector_models')
	model_file='vector_models'+os.sep+'model_'+str(freqThresh)+'_'+str(knownThresh)+'.pkl'

		
	start=time.time()
	print("Dumping...")
	pickle_dump(filteredModel._modelDict, model_file)
	end=time.time()
	elapsed=end-start
	print("Time to dump is " + str(elapsed))

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