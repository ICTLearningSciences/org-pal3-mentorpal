import ffmpy
import csv
import ibm_stt
import sys
import os
import fnmatch

'''
Converts the .mp4 file to a .wav file.
Later, this .wav file is split into smaller chunks for each Q-A pair.
This is done because we want transcriptions for each question and the interview contains
lots of other content like general talking and discussions.
We use the timestamps for each Q-A to split the .wav file.
This function is equivalent to running `ffmpeg -i input_file output_file -loglevel quiet` on the command line.

Parameters:
input_file: Examples are /example/path/to/session1/session1part1.mp4, /example/path/to/session1/session1part2.mp4
output_file: Examples are /example/path/to/session1/session1part1.wav, /example/path/to/session1/session1part2.wav
'''
def convert_to_wav(input_file, output_file):
    output_command=" -loglevel quiet"
    ff=ffmpy.FFmpeg(
        inputs={input_file: None},
        outputs={output_file: output_command}
    )
    ff.run()

'''
Splits the large .wav file into chunks based on the start_time and end_time of chunk.
audiochunks is the folder where the chunks are stored, based on the ID of the Q-A pair.
This function is equivalent to running `ffmpeg -i input_file -ss start_time -to end_time -loglevel quiet` on the command line.
start_time and end_time must be in seconds. For example, a time 01:03:45 is 01*3600 + 03*60 + 45 = 3825 seconds.
See convert_to_seconds(time) function which does this for you.

Parameters:
audiochunks: The audiochunks directory /example/path/to/session1/audiochunks
input_file: /example/path/to/session1/session1part1.wav, /example/path/to/session1/session1part2.wav
index: question number
'''
def ffmpeg_split(audiochunks, input_file, index, start_time, end_time):
    output_file=audiochunks+"/q"+str(index)+".wav"
    output_command="-ss "+str(start_time)+" -to "+str(end_time)+" -loglevel quiet"
    ff=ffmpy.FFmpeg(
        inputs={input_file: None},
        outputs={output_file: output_command},
    )
    ff.run()

'''
Converts a timestamp from HH:MM:SS or MM:SS to seconds.
For example, a time 01:03:45 is 01*3600 + 03*60 + 45 = 3825 seconds

Parameters:
time: time string
'''
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

'''
Reads the timestamps from file, converts into seconds and calls ffmpeg_split(...) to split the large .wav file.

Parameters:
audiochunks: The audiochunks directory /example/path/to/session1/audiochunks
audio_file: /example/path/to/session1/session1part1.wav, /example/path/to/session1/session1part2.wav
timestamps: /example/path/to/session1/session1part1_timestamps.csv, /example/path/to/session1/session1part2_timestamps.csv
offset: If a session has more than one recorded video, the offset will indicate how many questions
        was seen till the end of the previous session. If we have two sessions and the first one
        had 25 questions, then the offset will be 26 when the second session is processed.
'''
def split_into_chunks(audiochunks, audio_file, timestamps, offset):
    start_times=[] #list of start times
    end_times=[] #list of end times
    questions=[] #list of questions
    with open(timestamps, 'r') as csvfile:
        csvreader=csv.reader(csvfile)
        csvreader.next() #Skip the header
        for row in csvreader:
            questions.append(row[0])
            start_times.append(row[1])
            end_times.append(row[2])

    #convert all start times to seconds
    for i in range(0,len(start_times)):
        start_times[i]=convert_to_seconds(start_times[i])
    
    #convert all end times to seconds
    for i in range(0,len(end_times)):
        end_times[i]=convert_to_seconds(end_times[i])

    #get all the chunks
    for i in range(0,len(start_times)):
        print "Processed chunk "+str(i)
        ffmpeg_split(audiochunks, audio_file, offset+i, start_times[i], end_times[i])
    return questions

'''
Once all the audio chunks are obtained, open a new .csv file inside the directory of that session.
Send each audio chunk to IBM Watson and it will return the transcript for that answer. Write it
to the transcript file. Since there might be more than one session, the file is opened in 'a' mode,
which appends new entries rather than overwriting the file.
This function is called once per part of the session. If session has two parts, this function is called twice.
Hence, the offset is also used.

Parameters:
dirname: The session directory /example/path/to/session1
audiochunks: The audiochunks directory /example/path/to/session1/audiochunks
questions: The list of questions which was returned by the split_into_chunks(...) function
offset: Question number offset as described before
'''
def get_transcript(dirname, audiochunks, questions, offset):
    transcript_csv=open(dirname+'transcript.csv','a')
    csvwriter=csv.writer(transcript_csv)

    for i in range(0,len(questions)):
        wav_file=audiochunks+"/q"+str(offset+i)+".wav"
        transcript=ibm_stt.watson(wav_file)
        csvwriter.writerow([questions[i], transcript])

    transcript_csv.close()



def main():
    #dirname must be /example/path/to/session1 - top level directory for the session
    dirname=sys.argv[1]

    #Checks if dirname has '/' at end. If not, adds it. Just a sanity check
    if dirname[-1] != '/':
        dirname+='/'
    #Finds out how many parts are there in the session
    number_of_parts=len(fnmatch.filter(os.listdir(dirname), '*.mp4'))
    session_number=dirname[-2]

    print "Started processing the session..."
    for i in range(number_of_parts):
        video=dirname+'session'+str(session_number)+'part'+str(i+1)+'.mp4'
        audio=dirname+'session'+str(session_number)+'part'+str(i+1)+'.wav'
        timestamps=dirname+'session'+str(session_number)+'part'+str(i+1)+'_timestamps.csv'
        audiochunks=dirname+'audiochunks'
        offset=0

        #Create audiochunks directory if it doesn't exist. Won't exist during first session processing
        #but will exist thereafter
        if not os.path.isdir(audiochunks):
            os.mkdir(audiochunks)
        #if audiochunks directory exists, then there is an offset
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

if __name__=="__main__":
    main()