import ffmpy
import csv
import sys
import os
import fnmatch
import pandas as pd
class PostProcessData(object):
    def __init__(self, answer_chunks, utterance_chunks, answer_number, utterance_number, mentor_name, corpus, corpus_index):
        self.answer_chunks=answer_chunks
        self.utterance_chunks=utterance_chunks
        self.answer_number=answer_number
        self.utterance_number=utterance_number
        self.mentor_name=mentor_name
        self.corpus=corpus.fillna('')
        self.corpus_index=corpus_index
        self.training_data=[] #training data to write to file, for use by classifier in later stage.
    '''
    Splits the large .mp4 file into chunks based on the start_time and end_time of chunk.
    This function is equivalent to running `ffmpeg -i input_file -ss start_time -to end_time output_file -loglevel quiet` on the command line.
    start_time and end_time must be in seconds. For example, a time 01:03:45 is 01*3600 + 03*60 + 45 = 3825 seconds.
    See convert_to_seconds(time) function which does this for you.
    FFMpeg will automatically recognize whether the result must be audio or video, based on the extension of the output_file.

    Parameters:
    input_file: /example/path/to/mentor/session1/session1part1.mp4, /example/path/to/mentor/session1/session1part2.mp4
    output_file: /example/path/to/mentor/session1/answer_videos/answer_1.ogv
    start_time: Start time of answer
    end_time: End time of answer
    '''
    def ffmpeg_split_video(self, input_file, output_file, start_time, end_time):
        output_command="-ss "+str(start_time)+" -to "+str(end_time)+" -c:v libtheora -q:v 6 -loglevel quiet"
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
    def convert_to_seconds(self, time):
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


    def get_video_chunks(self, video_file, timestamps, mentor_name, session_number, part_number):
        text_type=[]
        start_times=[] #list of start times
        end_times=[] #list of end times
        text=[] #list of text
        
        timestamps_file=pd.read_csv(timestamps)
        #by default, pandas reads empty cells as 0. Since we are dealing with text,we put empty string instead of 0
        timestamps_file = timestamps_file.fillna('')

        for i in range(0,len(timestamps_file)):
            text_type.append(timestamps_file.iloc[i]['Answer/Utterance'])
            text.append(timestamps_file.iloc[i]['Question'])
            start_times.append(timestamps_file.iloc[i]['Response start'])
            end_times.append(timestamps_file.iloc[i]['Response end'])

        #convert all start times to seconds
        for i in range(0,len(start_times)):
            start_times[i]=self.convert_to_seconds(start_times[i])
        
        #convert all end times to seconds
        for i in range(0,len(end_times)):
            end_times[i]=self.convert_to_seconds(end_times[i])

        #get all the chunks
        for i in range(0,len(start_times)):
            print("Processed chunk "+str(i))
            training_sample={}
            if text_type[i]=='A' and len(self.corpus) > self.corpus_index:
                answer_id=self.mentor_name+"_A"+str(self.answer_number)+"_"+str(session_number)+"_"+str(part_number)
                output_file=os.path.join(self.answer_chunks, answer_id+".ogv")
                training_sample['ID']=answer_id
                training_sample['topics']=self.corpus.iloc[self.corpus_index]['Topics']+","+self.corpus.iloc[self.corpus_index]['Helpers']
                if training_sample['topics'][-1]==',':
                    training_sample['topics']=training_sample['topics'][:-1]
                training_sample['question']=self.corpus.iloc[self.corpus_index]['Question']+'\r\n'+self.corpus.iloc[self.corpus_index]['P1']+'\r\n'+\
                self.corpus.iloc[self.corpus_index]['P2']+'\r\n'+self.corpus.iloc[self.corpus_index]['P3']+'\r\n'+\
                self.corpus.iloc[self.corpus_index]['P4']+'\r\n'+self.corpus.iloc[self.corpus_index]['P5']+'\r\n'+\
                self.corpus.iloc[self.corpus_index]['P6']+'\r\n'+self.corpus.iloc[self.corpus_index]['P7']+'\r\n'+\
                self.corpus.iloc[self.corpus_index]['P8']+'\r\n'+self.corpus.iloc[self.corpus_index]['P9']+'\r\n'+\
                self.corpus.iloc[self.corpus_index]['P10']
                training_sample['question']=training_sample['question'].strip()
                training_sample['text']=self.corpus.iloc[self.corpus_index]['text']
                self.corpus_index+=1
                self.answer_number+=1
                self.training_data.append(training_sample)
            elif text_type[i]=='U':
                #csv for utterance chunks is needed!!
                utterance_id=self.mentor_name+"_U"+str(self.utterance_number)+"_"+str(session_number)+"_"+str(part_number)
                output_file=os.path.join(self.utterance_chunks, utterance_id+".ogv")
                self.utterance_number+=1
            '''
            Uncomment this line when you want to get the actual cut answers. This takes a long time so this isn't needed
            when testing the code for the other parts
            '''
            #self.ffmpeg_split_video(video_file, output_file, start_times[i], end_times[i])
    '''
    Write all the data to file.
    classifier_data.csv: data for use by the classifier
    metadata.txt: data about the data preparation process. This helps when new sessions are added. No need to start from scratch
    NPCEditor_data.xlsx: data for NPCEditor
    '''
    
    def write_data(self):
        #data for Classifier
        classifier_header=True
        if os.path.exists(os.path.join("data","classifier_data.csv")):
            classifier_header=False

        classifier_df=pd.DataFrame(self.training_data,columns=['ID','topics','text','question'])
        with open(os.path.join("data","classifier_data.csv"), 'a') as classifier_file:
             classifier_df.to_csv(classifier_file, header=classifier_header, index=False, encoding='utf-8')

        #store meta-data for later use
        meta_header=True
        if os.path.exists(os.path.join("data","metadata.csv")):
            curr_metadata_df=pd.read_csv(open(os.path.join("data","metadata.csv"),'rb'))
            startrow=len(curr_metadata_df)+1
            meta_header=False
            for i in range(0,len(curr_metadata_df)):
                if curr_metadata_df.iloc[i]['Mentor Name'] == self.mentor_name:
                    curr_metadata_df.set_value(i, 'Next Answer Number', str(self.answer_number))
                    curr_metadata_df.set_value(i, 'Next Utterance Number', str(self.utterance_number))
                #corpus index is common for all mentors
                curr_metadata_df.set_value(i, 'Corpus Index', str(self.corpus_index))
        else:
            metadata={}
            metadata['Mentor Name']=self.mentor_name
            metadata['Next Answer Number']=self.answer_number
            metadata['Next Utterance Number']=self.utterance_number
            metadata['Corpus Index']=self.corpus_index
            metadata=[metadata]
            metadata_df=pd.DataFrame(metadata, columns=['Mentor Name', 'Next Answer Number', 'Next Utterance Number', 'Corpus Index'])

        #write metadata to file, depending on whether the file already exists or not
        with open(os.path.join("data","metadata.csv"),'a') as metadata_file:
            #if it doesn't exist, write new data
            if meta_header:
                metadata_df.to_csv(metadata_file, header=meta_header, index=False, encoding='utf-8')
            #if it exists, then write the modified data
            else:
                curr_metadata_df.to_csv(metadata_file, header=meta_header, index=False, encoding='utf-8')

        #data for NPCEditor
        npc_header=True
        if os.path.exists(os.path.join("data","NPCEditor_data.xlsx")):
            curr_npceditor_df=pd.read_excel(open(os.path.join("data","NPCEditor_data.xlsx"),'rb'),sheetname='Sheet1')
            startrow=len(curr_npceditor_df)+1
            npc_header=False
        npceditor_test_data=[]
        for i in range(0,len(self.training_data)):
            questions=self.training_data[i]['question'].split('\r\n')
            npceditor_test_data.append(questions.pop(-1))
            self.training_data[i]['question']='\r\n'.join(questions)
        npceditor_df=pd.DataFrame(self.training_data,columns=['ID','text','question'])
        if not npc_header:
            frames=[curr_npceditor_df,npceditor_df]
            df_to_write=pd.concat(frames)
        else:
            df_to_write=npceditor_df

        npceditor_writer=pd.ExcelWriter(os.path.join("data","NPCEditor_data.xlsx"),engine='openpyxl')
        df_to_write.to_excel(npceditor_writer,'Sheet1', index=False, header=npc_header)
        npceditor_writer.save()



def main():
    #dirname must be /example/path/to/mentor/ - top level directory for all sessions of that mentor
    dirname=sys.argv[1]
    #If you want to do only one session, then give both start_session and end_session as same number.
    #If you want to do sessions 2,3,4, then give start_session=2 and end_session=4.
    #Program will do all sessions in range [start_session,end_session]. Both inclusive.
    start_session=int(sys.argv[2])
    end_session=int(sys.argv[3])
    #Checks if dirname has '/' at end. If not, adds it. Just a sanity check
    if dirname[-1] != os.sep:
        dirname+=os.sep
    mentor_name=dirname.split(os.sep)[-2]
    sessions=[]
    for i in range(start_session, end_session+1):
        sessions.append("session"+str(i))
    number_of_sessions=len(sessions)
    #store answer video chunks in this folder.
    answer_chunks=dirname+"answer_videos"
    #Create answer_videos directory if it doesn't exist
    if not os.path.isdir(answer_chunks):
        os.mkdir(answer_chunks)

    #store prompts and repeat-after-me videos in this folder
    utterance_chunks=dirname+"utterance_videos"
    #Create utterance_videos directory if it doesn't exist
    if not os.path.isdir(utterance_chunks):
        os.mkdir(utterance_chunks)
    
    #Load older metadata, to see where to continue numbering answers and utterances from, for the current mentor
    if not os.path.exists(os.path.join("data","metadata.csv")):
        next_answer=1
        next_utterance=1
        corpus_index=0
    else:
        with open(os.path.join("data","metadata.csv"),'rb') as metadata_file:
            curr_metadata_df=pd.read_csv(open(os.path.join("data","metadata.csv"),'rb'))
            if len(curr_metadata_df) > 0:
                mentor_found = False
                for i in range(0,len(curr_metadata_df)):
                    corpus_index=int(curr_metadata_df.iloc[i]['Corpus Index'])
                    if curr_metadata_df.iloc[i]['Mentor Name'] == mentor_name:
                        mentor_found = True
                        next_answer=int(curr_metadata_df.iloc[i]['Next Answer Number'])
                        next_utterance=int(curr_metadata_df.iloc[i]['Next Utterance Number'])
                        
                if not mentor_found:
                    corpus_index=int(curr_metadata_df.iloc[i]['Corpus Index']) #corpus index is common for all mentors
                    next_answer=1
                    next_utterance=1
            #the file is present but no data in it. Sanity check
            else:
                next_answer=1
                next_utterance=1
                corpus_index=0


    #Load the corpus which contains questions, paraphrases and answers
    corpus=pd.read_excel(open(os.path.join("data","Questions_Paraphrases_Answers.xlsx"),'rb'), sheetname='Sheet1')
    ppd=PostProcessData(answer_chunks, utterance_chunks, next_answer, next_utterance, mentor_name, corpus, corpus_index)
    #Walk into each session directory and get the answer chunks from each session
    for session in sessions:
        session_path=dirname+session+os.sep
        number_of_parts=len(fnmatch.filter(os.listdir(session_path), "*.mp4"))
        for j in range(number_of_parts):
            video_file=session_path+session+"part"+str(j+1)+".mp4"
            timestamp_file=session_path+session+"part"+str(j+1)+"_timestamps.csv"
            ppd.get_video_chunks(video_file, timestamp_file, mentor_name, int(session[7:]), j+1)
    #write the data to file, for use by classifier and NPCEditor
    ppd.write_data()


if __name__=='__main__':
    main()