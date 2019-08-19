import subprocess
import pandas as pd
import math
import ffmpy
import utils

videoPath = r"""/Users/markchristenson/Developer/ict/MentorPAL/mentors/julianne-demo/videos/answer_videos/"""
ffmpegPath = r"""/usr/local/bin/ffmpeg"""
classifierDataPath = r"""/Users/markchristenson/Developer/ict/MentorPAL/mentors/julianne-demo/data/classifier_data.csv"""


def find(s, ch):  # gives indexes of all of the spaces so we don't split words apart
    return [i for i, ltr in enumerate(s) if ltr == ch]


def getDurations(ID):
    try:
        process = subprocess.Popen(
            [ffmpegPath, "-i", videoPath + ID + """.mp4"""],
            stdout=subprocess.PIPE,
            stderr=subprocess.STDOUT,
        )
        stdout, stderr = process.communicate()
        statusString = stdout.decode()
        a = int(statusString.find("Duration:"))
        print(statusString)
        time = utils.convert_to_seconds(statusString[a + 10 : a + 21])  # gets the duration
        return time
    except (ValueError, IndexError):
        print("Video not Found")
        return "error"


df = pd.read_csv(classifierDataPath, encoding="cp1252")  # read
output = pd.DataFrame()

for i in range(len(df["ID"])):
    ID = str(df["ID"][i])  # get's the i'th value
    time = getDurations(ID)
    if time == "error":
        continue
    # print(time) #this is the amount of seconds tied down to that ID
    transcript = str(df["text"][i])  # the transcript needed
    pieceLength = 68
    wordIndexes = find(transcript, " ")
    splitIndex = [0]
    for k in range(1, len(wordIndexes)):
        for l in range(1, len(wordIndexes)):
            if wordIndexes[l] > pieceLength * k:
                splitIndex.append(wordIndexes[l])
                break
    splitIndex.append(len(transcript))
    # print(splitIndex)
    amountOfChunks = math.ceil(len(transcript) / pieceLength)
    print(videoPath + ID + ".vtt")
    text_file = open(videoPath + ID + ".vtt", "w")  # opens up a file to print with
    text_file.write("WEBVTT FILE:\n\n")
    for j in range(len(splitIndex) - 1):  # this uses a constant piece length
        OutputList = []
        secondsStart = round((time / amountOfChunks) * j, 2) + 0.85
        secondsEnd = round((time / amountOfChunks) * (j + 1), 2) + 0.85
        outputStart = (
            str(math.floor(secondsStart / 60)).zfill(2)
            + ":"
            + ("%.3f" % (secondsStart % 60)).zfill(6)
        )
        outputEnd = (
            str(math.floor(secondsEnd / 60)).zfill(2)
            + ":"
            + ("%.3f" % (secondsEnd % 60)).zfill(6)
        )
        # print("00:" + outputStart +" --> "+"00:"+ outputEnd)

        text_file.write("00:" + outputStart + " --> " + "00:" + outputEnd + "\n")
        text_file.write(transcript[splitIndex[j] : splitIndex[j + 1]] + "\n\n")
        # OutputList.append([ID,time,transcript])
