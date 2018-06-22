import subprocess
import pandas as pd
import math

videoPath = r'''E:/MentorPalVideos/clint/answer_videos/'''
ffmpegPath = r'''C:\Users\kshaw\Desktop\ffmpeg-20180611-8c20ea8-win64-static\bin\ffmpeg.exe'''
classifierDataPath = r'''C:/Users/kshaw/Desktop/classifier_data.csv'''

def convert_to_seconds(time):   #copied from pre-process and post-process, handles ":"
    time=time.split(":")
    hours=0
    minutes=0
    seconds=0
    if len(time)==2:
        minutes, seconds = time[0], time[1]
    else:
        hours, minutes, seconds = time[0], time[1], time[2]
    hours=int(hours)
    minutes = int(minutes)
    seconds = float(seconds)
    result = int(3600*hours + 60 * minutes + seconds)
    return result

def find(s, ch):    #gives indexes of all of the spaces so we don't split words apart
    return [i for i, ltr in enumerate(s) if ltr == ch]
def getDurations(ID):
    process = subprocess.Popen([ffmpegPath,  '-i', videoPath + ID +'''.mp4'''], stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
    stdout, stderr = process.communicate()
    statusString = stdout.decode()
    a = int(statusString.find("Duration:"))
    #print(statusString)
    time = convert_to_seconds(statusString[a+10:a+21])  #gets the duration
    return time
    
df = pd.read_csv(classifierDataPath) #read 
output = pd.DataFrame()

for i in range(len(df["ID"])):
    ID = str(df["ID"][i])#get's the i'th value
    time = getDurations(ID)
    #print(time) #this is the amount of seconds tied down to that ID
    transcript = str(df["text"][i]) #the transcript needed
    pieceLength = 68
    wordIndexes = find(transcript,' ')
    splitIndex = [0]
    for k in range(1,len(wordIndexes)):
        for l in range(1,len(wordIndexes)):
            if wordIndexes[l]>pieceLength*k:
                splitIndex.append(wordIndexes[l])
                break
    splitIndex.append(len(transcript))
    #print(splitIndex)
    amountOfChunks = math.ceil(len(transcript)/pieceLength)
    text_file = open(videoPath+ID+".vtt", "w") #opens up a file to print with
    text_file.write("WEBVTT FILE:\n\n")
    for j in range(len(splitIndex)-1):  #this uses a constant piece length
        OutputList = []
        secondsStart = round((time/amountOfChunks)*j,2)+0.85
        secondsEnd = round((time/amountOfChunks)*(j+1),2)+0.85
        outputStart = str(math.floor(secondsStart/60)).zfill(2)+":"+ ('%.3f'%(secondsStart%60)).zfill(6)
        outputEnd = str(math.floor(secondsEnd/60)).zfill(2)+":"+ ('%.3f'%(secondsEnd%60)).zfill(6)
        print("00:" + outputStart +" --> "+"00:"+ outputEnd)
        
        text_file.write("00:" + outputStart +" --> "+"00:"+ outputEnd +'\n')   
        text_file.write(transcript[splitIndex[j]:splitIndex[j+1]]+'\n\n')
        #OutputList.append([ID,time,transcript])


