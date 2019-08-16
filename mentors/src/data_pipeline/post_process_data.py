import ffmpy
import fnmatch
import os
import pandas as pd
import re

import constants
import utils


"""
This script will generate classifier data, utterance data, and metadata used to
train a classifier for a mentor. This script requires that the build folder with
mentor data has been generated.
"""

MENTOR_DATA = constants.MENTOR_DATA
MENTOR_BUILD = constants.MENTOR_BUILD
MENTOR_VIDEOS = constants.MENTOR_VIDEOS
SESSION_DATA = constants.SESSION_DATA
ANSWER_VIDEOS = constants.ANSWER_VIDEOS
UTTERANCE_VIDEOS = constants.UTTERANCE_VIDEOS

PU_FILENAME = constants.PU_FILENAME
QPA_FILENAME = constants.QPA_FILENAME
DATA_FILENAME = constants.DATA_FILENAME
VIDEO_FILE = constants.VIDEO_FILE
AUDIO_FILE = constants.AUDIO_FILE
TIMESTAMP_FILE = constants.TIMESTAMP_FILE
UTTERANCE_DATA = constants.UTTERANCE_DATA
CLASSIFIER_DATA = constants.CLASSIFIER_DATA
METADATA = constants.METADATA

DATA_DIR = os.environ["DATA_MOUNT"] or os.getcwd()


def ffmpeg_convert_mobile(input_file):
    # Trim file type and append mp4
    output_file = "{}_m.mp4".format(input_file.rsplit(".", 1)[0])
    ff = ffmpy.FFmpeg(
        inputs={input_file: None},
        # outputs={output_file: "-filter:v crop=614:548:333:86 -y"},  This is for the 1280x720
        outputs={
            output_file: "-filter:v crop=918:822:500:220 -threads 0 -y"
        },  # this is for 1080p  the parameters are width, height, x and y point
    )
    print(ff.cmd + "\n")
    ff.run()


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
    ff = ffmpy.FFmpeg(inputs={input_file: None}, outputs={output_file: output_command})
    ff.run()


class PostProcessData(object):
    def __init__(
        self,
        answer_number,
        utterance_number,
        mentor_name,
        answer_corpus,
        answer_corpus_index,
        utterance_corpus,
        utterance_corpus_index,
    ):
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

    def get_video_chunks(self, video_file, timestamps, mentor, session, part, videos):
        print(video_file, timestamps, mentor, session, part)

        # Pandas reads empty cells as 0, replace with empty string
        timestamps_file = pd.read_csv(timestamps).fillna("")
        rows = range(0, len(timestamps_file))
        text_type = [timestamps_file.iloc[i]["Answer/Utterance"] for i in rows]
        start_times = [timestamps_file.iloc[i]["Response start"] for i in rows]
        end_times = [timestamps_file.iloc[i]["Response end"] for i in rows]

        start_times = [utils.convert_to_seconds(time) for time in start_times]
        end_times = [utils.convert_to_seconds(time) for time in end_times]

        # get all the chunks
        for i in range(0, len(start_times)):
            if (
                text_type[i] == "A"
                and len(self.answer_corpus) > self.answer_corpus_index
            ):
                answer_sample = {}
                curr_chunk = self.answer_corpus.iloc[self.answer_corpus_index]
                answer_id = f"{mentor}_a{self.answer_number}_{session}_{part}"
                answer_sample["ID"] = answer_id
                answer_sample["topics"] = ",".join(
                    [curr_chunk["Topics"], curr_chunk["Helpers"]]
                )
                if answer_sample["topics"][-1] == ",":
                    answer_sample["topics"] = answer_sample["topics"][:-1]

                answer_sample["question"] = "{}\r\n".format(curr_chunk["Question"])
                # Add all paraphrases to answer_sample["question"] string
                paraphrase_pattern = re.compile(r"[P]\d+")
                for col in self.answer_corpus.columns:
                    if re.match(paraphrase_pattern, col):
                        answer_sample["question"] += "{}\r\n".format(curr_chunk[col])
                answer_sample["question"] = answer_sample["question"].strip()

                answer_sample["text"] = curr_chunk["text"]
                self.answer_corpus_index += 1
                self.answer_number += 1
                self.training_data.append(answer_sample)

                web_answers = os.path.join(mentor_videos, ANSWER_VIDEOS, "web")
                os.makedirs(web_answers, exist_ok=True)
                mobile_answers = os.path.join(mentor_videos, ANSWER_VIDEOS, "mobile")
                os.makedirs(mobile_answers, exist_ok=True)
                web_output_file = os.path.join(web_answers, f"{answer_id}.mp4")
                mobile_output_file = os.path.join(mobile_answers, f"{answer_id}.mp4")

            elif (
                text_type[i] == "U"
                and len(self.utterance_corpus) > self.utterance_corpus_index
            ):
                utterance_sample = {}
                curr_chunk = self.utterance_corpus.iloc[self.utterance_corpus_index]
                utterance_id = f"{mentor}_u{self.utterance_number}_{session}_{part}"
                utterance_sample["ID"] = utterance_id
                utterance_sample["utterance"] = curr_chunk["Utterance/Prompt"]
                utterance_sample["situation"] = curr_chunk["Situation"]
                self.utterance_corpus_index += 1
                self.utterance_number += 1
                self.utterance_data.append(utterance_sample)

                web_utterances = os.path.join(mentor_videos, UTTERANCE_VIDEOS, "web")
                os.makedirs(web_utterances, exist_ok=True)
                mobile_utterances = os.path.join(mentor_videos, UTTERANCE_VIDEOS, "mobile")
                os.makedirs(mobile_utterances, exist_ok=True)
                web_output_file = os.path.join(web_answers, f"{utterance_id}.mp4")
                mobile_output_file = os.path.join(mobile_answers, f"{utterance_id}.mp4")

            if videos:
                ffmpeg_split_video(
                    video_file, web_output_file, start_times[i], end_times[i]
                )
                ffmpeg_convert_mobile(mobile_output_file)

    def write_data(self, mentor):
        """
        Write all the data to file.
        classifier_data.csv: data for use by the classifier
        metadata.txt: data about the data preparation process. This helps when new sessions are added. No need to start from scratch
        """
        # data for Classifier
        classifier_header = True
        mentor_data = os.path.join(DATA_DIR, MENTOR_DATA.format(mentor))
        classifier_file_path = os.path.join(mentor_data, CLASSIFIER_DATA)
        if os.path.exists(classifier_file_path):
            classifier_header = False

        classifier_df = pd.DataFrame(
            self.training_data, columns=["ID", "topics", "text", "question"]
        )
        with open(os.path.join(classifier_file_path), "a") as classifier_file:
            classifier_df.to_csv(
                classifier_file, header=classifier_header, index=False, encoding="utf-8"
            )

        # data for prompts and utterances
        utterance_header = True
        utterance_file_path = os.path.join(mentor_data, UTTERANCE_DATA)
        if os.path.exists(utterance_file_path):
            utterance_header = False

        utterance_df = pd.DataFrame(
            self.utterance_data, columns=["ID", "utterance", "situation"]
        )
        with open(utterance_file_path, "a") as utterance_file:
            utterance_df.to_csv(
                utterance_file, header=utterance_header, index=False, encoding="utf-8"
            )

        # store meta-data for later use
        metadata_df = None
        metadata_file_path = os.path.join(mentor_data, METADATA)
        if os.path.exists(metadata_file_path):
            metadata_df = pd.read_csv(open(metadata_file_path, "rb"))
            for i in range(0, len(metadata_df)):
                if metadata_df.iloc[i]["Mentor Name"] == self.mentor_name:
                    metadata_df.at[i, "Next Answer Number"] = str(self.answer_number)
                    metadata_df.at[i, "Next Utterance Number"] = str(
                        self.utterance_number
                    )
                # answer_corpus index is common for all mentors
                metadata_df.at[i, "Answer Corpus Index"] = str(self.answer_corpus_index)
                metadata_df.at[i, "Utterance Corpus Index"] = str(
                    self.utterance_corpus_index
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
        with open(metadata_file_path, "w") as metadata_file:
            metadata_df.to_csv(
                metadata_file, header=True, index=False, encoding="utf-8"
            )


def build_post_processing_data(args):
    mentor_data = os.path.join(DATA_DIR, MENTOR_DATA.format(args.mentor))
    mentor_videos = os.path.join(DATA_DIR, MENTOR_VIDEOS.format(args.mentor))


    # Load older metadata, to see where to continue numbering answers and utterances from, for the current mentor
    metadata_file = os.path.join(mentor_data, METADATA)
    if not os.path.exists(metadata_file):
        next_answer = 1
        next_utterance = 1
        answer_corpus_index = 0
        utterance_corpus_index = 0
    else:
        curr_metadata_df = pd.read_csv(open(metadata_file, "rb"))
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
    answer_corpus = pd.read_csv(os.path.join(mentor_data, QPA_FILENAME))
    utterance_corpus = pd.read_csv(os.path.join(mentor_data, PU_FILENAME))
    ppd = PostProcessData(
        next_answer,
        next_utterance,
        args.mentor,
        answer_corpus,
        answer_corpus_index,
        utterance_corpus,
        utterance_corpus_index,
    )

    # Walk into each session directory and get the answer chunks from each session
    session = 1
    mentor_build = os.path.join(DATA_DIR, MENTOR_BUILD.format(args.mentor))
    session_path = os.path.join(mentor_build, SESSION_DATA.format(session))
    while os.path.isdir(session_path):
        print("INFO: Processing session {}".format(session))
        number_of_parts = len(fnmatch.filter(os.listdir(session_path), "*.mp4"))
        for j in range(number_of_parts):
            part = j + 1
            video_file = os.path.join(
                session_path, DATA_FILENAME.format(part, VIDEO_FILE)
            )
            timestamp_file = os.path.join(
                session_path, DATA_FILENAME.format(part, TIMESTAMP_FILE)
            )

            ppd.get_video_chunks(
                video_file, timestamp_file, args.mentor, session, part, args.videos
            )

        session += 1
        session_path = os.path.join(mentor_build, SESSION_DATA.format(session))

    # write the data to file, for use by classifier
    ppd.write_data(args.mentor)
