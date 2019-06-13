import numpy as np

'''
Prints resulting probability based on ascending number of words in model.
Takes in the size of the corpus and frequency constant calculated thereof.
'''
def thresholdsByProbability(sizeOfCorpus,frequencyConstant):
	probability = .01
	for x in range(0,19):
		probability = probability/2
		wordsInModel = 1/probability/frequencyConstant
		print("For probability: " + str(probability))
		print("Words in model: " + str(wordsInModel))

'''
Prints resulting number of words in model based on ascending probabilities.
Takes in the size of the corpus and frequency constant calculated thereof.
'''
def probabilityByThreshold(sizeOfCorpus, frequencyConstant):
	wordsInModel = 0

	while wordsInModel < 3000000:
		wordsInModel += 25000
		probability = 1/wordsInModel/frequencyConstant
		print("For threshold: " + str(wordsInModel) + " words in model")
		print("Probability: " + str(probability))



if __name__ == '__main__':
	sizeOfCorpus = 3000000
	frequencyConstant = np.log(sizeOfCorpus) - np.log(1)
	print("Frequency constant: " + str(frequencyConstant))

	#thresholdsByProbability(sizeOfCorpus, frequencyConstant)
	probabilityByThreshold(sizeOfCorpus, frequencyConstant)


	#sort dictionary and save to file
	#sorted_relevance = sorted(sortedDict.items(), key=operator.itemgetter(1))
	#reverse so words are high to low
	#sorted_relevance.reverse()
	#portion_sorted = sorted_relevance[:90]
	#save top values to csv
	#frame = pd.DataFrame(np.array(sorted_relevance),columns=["Word","Relevance"])
	#frame = frame.drop_duplicates(['Word'],keep="first")
	#frame.to_csv("../words_by_relevance.csv", index=None)
	#print("Done sorting/saving relevance!")
