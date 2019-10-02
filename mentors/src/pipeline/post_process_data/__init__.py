import ffmpy
import fnmatch
import os
import pandas as pd
import re
import requests

from pipeline import constants, utils
from .data_utils import gen_mobile_video


"""
This script will generate classifier data, utterance data, and metadata used to
train a classifier for a mentor. This script requires that the build folder with
mentor data has been generated.
"""

MENTOR_DATA = constants.MENTOR_DATA
MENTOR_BUILD = constants.MENTOR_BUILD
MENTOR_VIDEOS = constants.MENTOR_VIDEOS
SESSION_DATA = constants.SESSION_DATA
WEB_VIDEOS = constants.WEB_VIDEOS
MOBILE_VIDEOS = constants.MOBILE_VIDEOS
STATIC_VIDEOS = constants.STATIC_VIDEOS

PU_FILENAME = constants.PU_FILENAME
QPA_FILENAME = constants.QPA_FILENAME
DATA_FILENAME = constants.DATA_FILENAME
VIDEO_FILE = constants.VIDEO_FILE
AUDIO_FILE = constants.AUDIO_FILE
TIMESTAMP_FILE = constants.TIMESTAMP_FILE
UTTERANCE_DATA = constants.UTTERANCE_DATA
CLASSIFIER_DATA = constants.CLASSIFIER_DATA
METADATA = constants.METADATA
IDLE_FILE = constants.IDLE_FILE
MENTOR_INTRO = constants.MENTOR_INTRO

DATA_DIR = os.environ.get("DATA_MOUNT") or os.getcwd()


def ffmpeg_split_video(input_file, output_file, start_time, end_time):
    """
    Splits the large .mp4 file into chunks based on the start_time and end_time of chunk.
    This function is equivalent to running `ffmpeg -i input_file -ss start_time -to end_time output_file -loglevel quiet` on the command line.

    Parameters:
    input_file: /example/path/to/mentor/session1/session1part1.mp4
    output_file: /example/path/to/mentor/session1/answer_videos/answer_1.ogv
    start_time: Start time of answer
    end_time: End time of answer
    """
    output_command = f"-y -ss {start_time} -to {end_time} -loglevel quiet -threads 0"
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

    def generate_video_chunk_data(self, video_file, timestamps, args, session, part):
        mentor = args.mentor
        print(video_file, timestamps, mentor, session, part)
        text_type, questions, start_times, end_times = utils.load_timestamp_data(
            timestamps
        )

        # iterate through answers and utterances and save data for classifier
        for i in range(0, len(start_times)):
            if (
                text_type[i] == "A"
                and len(self.answer_corpus) > self.answer_corpus_index
            ):
                output_file = self.__save_answer_data__(mentor, session, part)

            elif (
                text_type[i] == "U"
                and len(self.utterance_corpus) > self.utterance_corpus_index
            ):
                output_file = self.__save_utterance_data__(mentor, session, part)

            # generate videos if requested via commandline flag
            if args.videos:
                mentor_videos = os.path.join(DATA_DIR, MENTOR_VIDEOS.format(mentor))
                web_chunk = os.path.join(mentor_videos, WEB_VIDEOS, output_file)
                mobile_chunk = os.path.join(mentor_videos, MOBILE_VIDEOS, output_file)
                ffmpeg_split_video(video_file, web_chunk, start_times[i], end_times[i])
                gen_mobile_video(web_chunk, mobile_chunk)

    def __save_answer_data__(self, mentor, session, part):
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
        return f"{answer_id}.mp4"

    def __save_utterance_data__(self, mentor, session, part):
        utterance_sample = {}
        curr_chunk = self.utterance_corpus.iloc[self.utterance_corpus_index]
        utterance_id = f"{mentor}_u{self.utterance_number}_{session}_{part}"
        utterance_sample["ID"] = utterance_id
        utterance_sample["utterance"] = curr_chunk["Utterance/Prompt"]
        utterance_sample["situation"] = curr_chunk["Situation"]
        self.utterance_corpus_index += 1
        self.utterance_number += 1
        self.utterance_data.append(utterance_sample)
        return f"{utterance_id}.mp4"

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


# TODO: Fix this horrible method
def download_static_videos(url, mentor, web_chunks, mobile_chunks):
    filenames = [IDLE_FILE, MENTOR_INTRO.format(mentor)]
    base_url = os.path.join(url, MENTOR_DATA.format(mentor), STATIC_VIDEOS)
    for filename in filenames:
        req_url = os.path.join(base_url, MOBILE_VIDEOS, filename)
        make_request(req_url, os.path.join(mobile_chunks, filename))
        req_url = os.path.join(base_url, WEB_VIDEOS, filename)
        make_request(req_url, os.path.join(web_chunks, filename))


def make_request(req_url, save_path):
    res = requests.get(req_url)
    if res.status_code == 200:
        open(save_path, "wb").write(res.content)


def build_post_processing_data(args):
    mentor_data = os.path.join(DATA_DIR, MENTOR_DATA.format(args.mentor))

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

    # prepare video folders if videos requested
    if args.videos:
        mentor_videos = os.path.join(DATA_DIR, MENTOR_VIDEOS.format(args.mentor))
        web_chunks = os.path.join(mentor_videos, WEB_VIDEOS)
        os.makedirs(web_chunks, exist_ok=True)
        mobile_chunks = os.path.join(mentor_videos, MOBILE_VIDEOS)
        os.makedirs(mobile_chunks, exist_ok=True)
        if args.url:
            print("INFO: Downloading Static Content (if exists)")
            download_static_videos(args.url, args.mentor, web_chunks, mobile_chunks)

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

            ppd.generate_video_chunk_data(
                video_file, timestamp_file, args, session, part
            )

        session += 1
        session_path = os.path.join(mentor_build, SESSION_DATA.format(session))

    # write the data to file, for use by classifier
    ppd.write_data(args.mentor)
