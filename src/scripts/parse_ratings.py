import os  
import sys
import glob
import csv
import pandas as pd
from nltk.metrics.agreement import AnnotationTask

def main():
	os.chdir("ratingfiles") #switch directory to directory holding log files
	
	allFiles = glob.glob("*.csv") #grab all files with extension
	allRatings = list() #list of 3-tuples for inter-rater agreement
	coderRatings = list() #list of all coder rating lists

	print ("Reading csv files...")

	for file_ in allFiles:
		print ("Found " + file_)
		df = pd.read_csv(file_,index_col=None, header=0,encoding="ISO-8859-1")

		#grab all ratings in order and add to list for percent agreement
		tempList = list()

		for index, row in df.iterrows():
			if str(row["ideal response"]).lower() == "x":
				allRatings.append((file_,str(index),"ideal"))
				tempList.append("ideal")
			elif str(row["reasonable response"]).lower() == "x":
				allRatings.append((file_,str(index),"reasonable"))
				tempList.append("reasonable")
			elif str(row["incorrect response"]).lower() == "x":
				allRatings.append((file_,str(index),"incorrect"))
				tempList.append("incorrect")
			else:
				print("ERROR: no rating in row " + str(index+2) + " of " + str(file_))

		#store each list of ratings for percent agreement
		coderRatings.append( list(tempList) )

	#Metrics for inter-rater agreement
	#(fair > 0.2, moderate > 0.4, substantial > 0.6, almost perfect > 0.8)
	ratingTask = AnnotationTask(data=allRatings)
	print("\nCOHEN'S KAPPA: " + str(ratingTask.kappa()))
	print("KRIPPENDORFF'S ALPHA: " + str(ratingTask.alpha()))
	print("FLEISS' KAPPA: " + str(ratingTask.multi_kappa()))
	print("SCOTT'S PI: " + str(ratingTask.pi()))

	#calculate percent agreement, ONLY FOR FIRST TWO RATERS
	matches = 0
	for index, item in enumerate(coderRatings[0]):
		if (item == coderRatings[1][index]):
			matches += 1
	print("\nPERCENT AGREEMENT: " + str((matches / len(coderRatings[0]))))
	print("Ratings agree on " + str(matches) + " of " + str(len(coderRatings[0]) + 1))

	#calculate accuracy of model averaging scores of all raters
	sumRatingScores = 0
	countIdeal = 0
	countReasonable = 0
	countIncorrect = 0
	for rater in coderRatings:
		for rating in rater:
			if rating == "ideal":
				sumRatingScores += 1
				countIdeal += 1
			elif rating == "reasonable":
				sumRatingScores += 0.5
				countReasonable += 1
			elif rating == "incorrect":
				countIncorrect += 1

	countRatings = len(coderRatings) * len(coderRatings[0])
	print("\nCustom accuracy rating: " + str(sumRatingScores / countRatings))
	print("Percent ideal: " + str(100*(countIdeal/countRatings)))
	print("Percent reasonable: " + str(100*(countReasonable/countRatings)))
	print("Percent incorrect: " + str(100*(countIncorrect/countRatings)))

if __name__=='__main__':
	main()
