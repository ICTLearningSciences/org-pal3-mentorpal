import ffmpy
import csv
import ibm_stt
import sys
import os
import fnmatch

def convert_to_wav(input_file, output_file):
    # output_file=input_file[:-4]+".wav"
    output_command=" -loglevel quiet"
    ff=ffmpy.FFmpeg(
        inputs={input_file: None},
        outputs={output_file: output_command}
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

def split_into_chunks(audiochunks, audio_file, timestamps, offset):
    start_times=[]
    end_times=[]
    questions=[]
    with open(timestamps, 'r') as csvfile:
        csvreader=csv.reader(csvfile)
        csvreader.next() #Skip the header
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
        ffmpeg_split(audiochunks, audio_file, offset+i, start_times[i], end_times[i])

    return questions

def get_transcript(dirname, audiochunks, questions, offset):
    transcript_csv=open(dirname+'transcript.csv','a')
    csvwriter=csv.writer(transcript_csv)

    for i in range(0,len(questions)):
        wav_file=audiochunks+"/q"+str(offset+i)+".wav"
        transcript=ibm_stt.watson(wav_file)
        csvwriter.writerow([questions[i], transcript])

    transcript_csv.close()



if __name__=="__main__":
    dirname=sys.argv[1]
    if dirname[-1] != '/':
        dirname+='/'
    number_of_parts=len(fnmatch.filter(os.listdir(dirname), '*.mp4'))
    session_number=dirname[-2]
    print "Started processing the session..."
    for i in range(number_of_parts):
        video=dirname+'session'+str(session_number)+'part'+str(i+1)+'.mp4'
        audio=dirname+'session'+str(session_number)+'part'+str(i+1)+'.wav'
        timestamps=dirname+'session'+str(session_number)+'part'+str(i+1)+'_timestamps.csv'
        audiochunks=dirname+'audiochunks'
        offset=0
        if not os.path.isdir(audiochunks):
            os.mkdir(audiochunks)
        else:
            offset=len(fnmatch.filter(os.listdir(audiochunks), '*.wav'))
        print "Processing part "+str(i+1)+"..."
        print "Converting video to audio..."
        convert_to_wav(video, audio)
        print "Completed converting to wav"
        print "Chunking the audio into smaller parts..."
        questions=split_into_chunks(audiochunks, audio,timestamps, offset)
        print "Finished chunking"
        print "Talking to IBM Watson to get transcripts..."
        get_transcript(dirname, audiochunks, questions, offset)
        print "Finished getting the transcripts"

    print "Video fully processed"

