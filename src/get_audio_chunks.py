import ffmpy
import chunkup
import csv
from pydub import AudioSegment
import time
import ibm_stt
import glob
import sys
import os

def convert_to_wav(input_file):
    output_file=input_file[:-4]+".wav"
    ff=ffmpy.FFmpeg(
        inputs={input_file: None},
        outputs={output_file: None}
    )
    ff.run()

def ffmpeg_split(audiochunks, input_file, index, start_time, end_time):
    output_file=audiochunks+"/q"+str(index)+".wav"
    output_command="-ss "+str(start_time)+" -to "+str(end_time)+" -loglevel quiet"
    ff=ffmpy.FFmpeg(
        inputs={input_file: None},
        outputs={output_file: output_command},
    )
    ff.run()

def convert_to_seconds(time):
    time=time.split(":")
    minutes, seconds = time[0], time[1]
    minutes = int(minutes)
    seconds = float(seconds)
    result = int(60 * minutes + seconds)
    return result

def split_into_chunks(audiochunks, audio_file, timestamps):
    start_times=[]
    end_times=[]
    questions=[]
    with open(timestamps, 'r') as csvfile:
        csvreader=csv.reader(csvfile)
        csvreader.next()
        for row in csvreader:
            questions.append(row[0])
            start_times.append(row[1])
            end_times.append(row[2])

    for i in range(0,len(start_times)):
        start_times[i]=convert_to_seconds(start_times[i])


    for i in range(0,len(end_times)):
        end_times[i]=convert_to_seconds(end_times[i])

    for i in range(0,len(start_times)):
        print "Processed chunk "+str(i)
        ffmpeg_split(audiochunks, audio_file, i, start_times[i], end_times[i])

    return questions

def get_transcript(dirname, audiochunks, questions):
    transcript_csv=open(dirname+'transcript.csv','w')
    csvwriter=csv.writer(transcript_csv)

    for i in range(0,len(questions)):
        wav_file=audiochunks+"/q"+str(i)+".wav"
        transcript=ibm_stt.watson(wav_file)
        csvwriter.writerow([questions[i], transcript])

    transcript_csv.close()



if __name__=="__main__":
    dirname=sys.argv[1]
    if dirname[-1] != '/':
        dirname+='/'

    video=dirname+'video.mp4'
    audio=dirname+'audio.wav'
    timestamps=dirname+'timestamps.csv'
    audiochunks=dirname+'audiochunks'
    os.mkdir(audiochunks)

    #convert_to_wav(video)
    print "Completed converting to wav"
    questions=split_into_chunks(audiochunks, audio,timestamps)
    print "Finished chunking"
    get_transcript(dirname, audiochunks, questions)
    print "Finished getting the transcripts"
    print "Video fully processed"
