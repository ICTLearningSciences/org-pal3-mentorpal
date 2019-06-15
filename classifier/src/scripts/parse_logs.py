import os
import sys
import glob
import csv
import pandas as pd

# function to process log files of user questions
# run with: 'python3 parse_logs.py'
# run from directory with child directory 'logfiles' containing all logfiles
# overwrites previous logs.csv


def main():
    # switch directory to directory holding log files
    os.chdir("logfiles")
    # grab all files with extension
    allFiles = glob.glob("*.log")
    # create a pandas DataFrame with columns labeled
    frame = pd.DataFrame(columns=["Answer", "Question"])
    # list to concatenate all csv files
    list_ = []
    print("Reading log files...")
    for file_ in allFiles:
        print(file_)
        df = pd.read_csv(file_, index_col=None, header=0, encoding="ISO-8859-1")
        list_.append(df)
    frame = pd.concat(list_, ignore_index=True)

    # drop duplicate user inputs and write to csv
    frame = frame.drop_duplicates(["Question"], keep="first")
    frame.to_csv("../logs.csv", index=None)


if __name__ == "__main__":
    main()

    # #set to ensure no duplicates
    # allInputs = dict()
    # #change directory to one containing log files
    # os.chdir("logfiles")

    # for file in glob.glob("*.log"):
    # 	# Set current input file
    # 	input_filename = file

    # 	# Open input file in 'read' mode
    # 	with open(input_filename, "r") as in_file:
    # 		print ("Reading logs...")
    # 	#skip first line
    # if next(in_file):
    # 	# Loop over each log line
    # 	for line in in_file:
    # 		#strips leading whitespace and newline character
    # 		line = line.strip()

    # 		# split up lines that contain user input
    # 		if len(line.split("\",")) == 2:
    # 			userInput = line.split("\",")[0].strip("\"")
    # 			response = line.split("\",")[1].strip("\"")
    # 			if userInput not in allInputs:
    # 				allInputs[userInput] = response

    # write to csv file, overwrites previous input
    # with open("../logs.csv", 'w') as csv_file:
    # 	print ("Writing logs to logs.csv...")
    # 	writer = csv.writer(csv_file, dialect = "excel")
    # 	for key, value in allInputs.items():
    # 		writer.writerow([key, value])
