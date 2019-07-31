import os
from threading import Thread
import sys

import ffmpy
import fnmatch
import pandas as pd

import utils

MENTOR_DATA = utils.MENTOR_DATA
SESSION_DATA = utils.SESSION_DATA

PU_FILENAME = utils.PU_FILENAME
QPA_FILENAME = utils.QPA_FILENAME
DATA_FILENAME = utils.DATA_FILENAME
VIDEO_FILE = utils.VIDEO_FILE
AUDIO_FILE = utils.AUDIO_FILE
TIMESTAMP_FILE = utils.TIMESTAMP_FILE

DATA_DIR = os.environ["DATA_MOUNT"] or os.getcwd()


def ffmpeg_convert_video(input_file):
    """
    Converts the video format to ogv and mp4's cropped for the website
    """
    output_file = input_file[0:-4]
    ff2 = ffmpy.FFmpeg(
        inputs={input_file: None},
        outputs={output_file + ".ogv": "-c:v libtheora -q:v 6 -threads 0 -y"},
    )
    print(ff2.cmd + "\n")
    ff2.run()


def ffmpeg_convert_mobile(input_file):
    output_file = input_file[0:-4] + "_M" + ".mp4"
    ff3 = ffmpy.FFmpeg(
        inputs={input_file: None},
        # outputs={output_file: "-filter:v crop=614:548:333:86 -y"},  This is for the 1280x720
        outputs={
            output_file: "-filter:v crop=918:822:500:220 -threads 0 -y"
        },  # this is for 1080p  the parameters are width, height, x and y point
    )
    print(ff3.cmd + "\n")
    ff3.run()


class PostProcessData(object):
    def __init__(
        self,
        answer_chunks,
        utterance_chunks,
        answer_number,
        utterance_number,
        mentor_name,
        answer_corpus,
        answer_corpus_index,
        utterance_corpus,
        utterance_corpus_index,
    ):
        self.answer_chunks = answer_chunks
        self.utterance_chunks = utterance_chunks
        self.answer_number = answer_number
        self.utterance_number = utterance_number
        self.mentor_name = mentor_name
        self.answer_corpus = answer_corpus.fillna("")
        self.answer_corpus_index = answer_corpus_index
        self.utterance_corpus = utterance_corpus.fillna("")
        self.utterance_corpus_index = utterance_corpus_index
        self.training_data = (
            []
        )  # training data to write to file, for use by classifier in later stage.
        self.utterance_data = (
            []
        )  # utterance data to write to file, for use by ensemble.py when checking question status


    def ffmpeg_split_video(self, input_file, output_file, start_time, end_time):
        """
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
        """
        output_command = f"-ss {start_time} -to {end_time} -loglevel quiet -threads 0"
        ff = ffmpy.FFmpeg(
            inputs={input_file: None}, outputs={output_file: output_command}
        )
        # print(ff.cmd)
        ff.run()
        print("Starting Thread")
        thread = Thread(target=ffmpeg_convert_video, args=(output_file,))
        thread.start()
        thread2 = Thread(target=ffmpeg_convert_mobile, args=(output_file,))
        thread2.start()


    def get_video_chunks(
        self, video_file, timestamps, mentor_name, session_number, part_number
    ):
        print(video_file, timestamps, mentor_name, session_number, part_number)
        text_type = []
        start_times = []  # list of start times
        end_times = []  # list of end times
        text = []  # list of text

        timestamps_file = pd.read_csv(timestamps)
        # by default, pandas reads empty cells as 0. Since we are dealing with text,we put empty string instead of 0
        timestamps_file = timestamps_file.fillna("")

        for i in range(0, len(timestamps_file)):
            text_type.append(timestamps_file.iloc[i]["Answer/Utterance"])
            text.append(timestamps_file.iloc[i]["Question"])
            start_times.append(timestamps_file.iloc[i]["Response start"])
            end_times.append(timestamps_file.iloc[i]["Response end"])

        start_times = [utils.convert_to_seconds(time) for time in start_times]
        end_times = [utils.convert_to_seconds(time) for time in end_times]

        # get all the chunks
        for i in range(0, len(start_times)):
            print("Processed chunk " + str(i))
            answer_sample = {}
            utterance_sample = {}
            if (
                text_type[i] == "A"
                and len(self.answer_corpus) > self.answer_corpus_index
            ):
                answer_id = f"{self.mentor_name}_A{self.answer_number}_{session_number}_{part_number}"
                output_file = os.path.join(self.answer_chunks, answer_id + ".mp4")
                answer_sample["ID"] = answer_id
                answer_sample["topics"] = ",".join(
                    [
                        self.answer_corpus.iloc[self.answer_corpus_index]["Topics"],
                        self.answer_corpus.iloc[self.answer_corpus_index]["Helpers"],
                    ]
                )
                if answer_sample["topics"][-1] == ",":
                    answer_sample["topics"] = answer_sample["topics"][:-1]
                answer_sample["question"] = "{}\r\n".format(
                    self.answer_corpus.iloc[self.answer_corpus_index]["Question"]
                )
                for j in range(1, 26):
                    index = f"P{j}"
                    answer_sample["question"] += "{}\r\n".format(
                        self.answer_corpus.iloc[self.answer_corpus_index][index]
                    )
                answer_sample["question"] = answer_sample["question"].strip()
                answer_sample["text"] = self.answer_corpus.iloc[
                    self.answer_corpus_index
                ]["text"]
                self.answer_corpus_index += 1
                self.answer_number += 1
                self.training_data.append(answer_sample)
            elif (
                text_type[i] == "U"
                and len(self.utterance_corpus) > self.utterance_corpus_index
            ):
                utterance_id = f"{self.mentor_name}_U{self.utterance_number}_{session_number}_{part_number}"
                output_file = os.path.join(self.utterance_chunks, utterance_id + ".mp4")
                utterance_sample["ID"] = utterance_id
                utterance_sample["utterance"] = self.utterance_corpus.iloc[
                    self.utterance_corpus_index
                ]["Utterance/Prompt"]
                utterance_sample["situation"] = self.utterance_corpus.iloc[
                    self.utterance_corpus_index
                ]["Situation"]
                self.utterance_corpus_index += 1
                self.utterance_number += 1
                self.utterance_data.append(utterance_sample)
            """
            Uncomment this line when you want to get the actual cut answers. This takes a long time so this isn't needed
            when testing the code for the other parts
            """
            print(f"OUTPUT FILE: {output_file}")
            self.ffmpeg_split_video(
                video_file, output_file, start_times[i], end_times[i]
            )


    def write_data(self):
        """
        Write all the data to file.
        classifier_data.csv: data for use by the classifier
        metadata.txt: data about the data preparation process. This helps when new sessions are added. No need to start from scratch
        """
        # data for Classifier
        classifier_header = True
        if os.path.exists(os.path.join("data", "classifier_data.csv")):
            classifier_header = False

        classifier_df = pd.DataFrame(
            self.training_data, columns=["ID", "topics", "text", "question"]
        )
        with open(os.path.join("data", "classifier_data.csv"), "a") as classifier_file:
            classifier_df.to_csv(
                classifier_file, header=classifier_header, index=False, encoding="utf-8"
            )

        # data for prompts and utterances
        utterance_header = True
        if os.path.exists(os.path.join("data", "utterance_data.csv")):
            utterance_header = False

        utterance_df = pd.DataFrame(
            self.utterance_data, columns=["ID", "utterance", "situation"]
        )
        with open(os.path.join("data", "utterance_data.csv"), "a") as utterance_file:
            utterance_df.to_csv(
                utterance_file, header=utterance_header, index=False, encoding="utf-8"
            )

        # store meta-data for later use
        metadata_df = None
        if os.path.exists(os.path.join("data", "metadata.csv")):
            metadata_df = pd.read_csv(open(os.path.join("data", "metadata.csv"), "rb"))
            for i in range(0, len(metadata_df)):
                if metadata_df.iloc[i]["Mentor Name"] == self.mentor_name:
                    metadata_df.set_value(
                        i, "Next Answer Number", str(self.answer_number)
                    )
                    metadata_df.set_value(
                        i, "Next Utterance Number", str(self.utterance_number)
                    )
                # answer_corpus index is common for all mentors
                metadata_df.set_value(
                    i, "Answer Corpus Index", str(self.answer_corpus_index)
                )
                metadata_df.set_value(
                    i, "Utterance Corpus Index", str(self.utterance_corpus_index)
                )
        else:
            metadata = {}
            metadata["Mentor Name"] = self.mentor_name
            metadata["Next Answer Number"] = self.answer_number
            metadata["Next Utterance Number"] = self.utterance_number
            metadata["Answer Corpus Index"] = self.answer_corpus_index
            metadata["Utterance Corpus Index"] = self.utterance_corpus_index
            metadata = [metadata]
            metadata_df = pd.DataFrame(
                metadata,
                columns=[
                    "Mentor Name",
                    "Next Answer Number",
                    "Next Utterance Number",
                    "Answer Corpus Index",
                    "Utterance Corpus Index",
                ],
            )

        # write metadata to file
        with open(os.path.join("data", "metadata.csv"), "w") as metadata_file:
            metadata_df.to_csv(
                metadata_file, header=True, index=False, encoding="utf-8"
            )


def build_post_processing_data(args):
    mentor_dir = os.path.join(DATA_DIR, MENTOR_DATA.format(args.mentor))

    sessions = []
    for i in range(start_session, end_session + 1):
        sessions.append(str(i))
    # store answer video chunks in this folder.
    answer_chunks = mentor_dir + "answer_videos"
    # Create answer_videos directory if it doesn't exist
    if not os.path.isdir(answer_chunks):
        os.mkdir(answer_chunks)

    # store prompts and repeat-after-me videos in this folder
    utterance_chunks = mentor_dir + "utterance_videos"
    # Create utterance_videos directory if it doesn't exist
    if not os.path.isdir(utterance_chunks):
        os.mkdir(utterance_chunks)

    # Load older metadata, to see where to continue numbering answers and utterances from, for the current mentor
    if not os.path.exists(os.path.join("data", "metadata.csv")):
        next_answer = 1
        next_utterance = 1
        answer_corpus_index = 0
        utterance_corpus_index = 0
    else:
        curr_metadata_df = pd.read_csv(open(os.path.join("data", "metadata.csv"), "rb"))
        if len(curr_metadata_df) > 0:
            mentor_found = False
            for i in range(0, len(curr_metadata_df)):
                answer_corpus_index = int(
                    curr_metadata_df.iloc[i]["Answer Corpus Index"]
                )
                utterance_corpus_index = int(
                    curr_metadata_df.iloc[i]["Utterance Corpus Index"]
                )
                if curr_metadata_df.iloc[i]["Mentor Name"] == args.mentor:
                    mentor_found = True
                    next_answer = int(curr_metadata_df.iloc[i]["Next Answer Number"])
                    next_utterance = int(
                        curr_metadata_df.iloc[i]["Next Utterance Number"]
                    )

            if not mentor_found:
                answer_corpus_index = int(
                    curr_metadata_df.iloc[i]["Answer Corpus Index"]
                )  # answer_corpus index is common for all mentors
                utterance_corpus_index = int(
                    curr_metadata_df.iloc[i]["Utterance Corpus Index"]
                )
                next_answer = 1
                next_utterance = 1
            # the file is present but no data in it. Sanity check
            else:
                next_answer = 1
                next_utterance = 1
                answer_corpus_index = 0
                utterance_corpus_index = 0

    # Load the answer corpus which contains questions, paraphrases and answers
    answer_corpus = pd.read_csv(os.path.join(os.getcwd(), "julianne/data", "questions_paraphrases_answers.csv"))
    utterance_corpus = pd.read_csv(os.path.join(os.getcwd(), "julianne/data", "prompts_utterances.csv"))
    ppd = PostProcessData(
        answer_chunks,
        utterance_chunks,
        next_answer,
        next_utterance,
        args.mentor,
        answer_corpus,
        answer_corpus_index,
        utterance_corpus,
        utterance_corpus_index,
    )
    # Walk into each session directory and get the answer chunks from each session
    for session in sessions:
        session_path = os.path.join(
            os.getcwd(), MENTOR_DATA.format(args.mentor), SESSION_DATA.format(session)
        )
        number_of_parts = len(fnmatch.filter(os.listdir(session_path), "*.mp4"))
        for j in range(number_of_parts):
            video_file = os.path.join(
                session_path, DATA_FILENAME.format(j + 1, VIDEO_FILE)
            )
            timestamp_file = os.path.join(
                session_path, DATA_FILENAME.format(j + 1, TIMESTAMP_FILE)
            )

            ppd.get_video_chunks(
                video_file, timestamp_file, args.mentor, int(session), j + 1
            )
    # write the data to file, for use by classifier
    ppd.write_data()


if __name__ == "__main__":
    main()
