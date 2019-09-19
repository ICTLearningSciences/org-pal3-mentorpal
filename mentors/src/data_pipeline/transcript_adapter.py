import os
import pandas as pd

import constants

"""
This script will adapt the transcript.csv into questions_paraphrases_answers.csv
The transcript.csv file is output by the data pre-processing stage of our data
pipeline.  which is output by our data
pre-processing stage
"""

SHARED_DATA = constants.SHARED_DATA
MENTOR_DATA = constants.MENTOR_DATA
MENTOR_BUILD = constants.MENTOR_BUILD
SESSION_DATA = constants.SESSION_DATA
SESSION_OUTPUT = constants.SESSION_OUTPUT

PU_FILENAME = constants.PU_FILENAME
QPA_FILENAME = constants.QPA_FILENAME
DATA_FILENAME = constants.DATA_FILENAME
TIMESTAMP_FILE = constants.TIMESTAMP_FILE
TRANSCRIPT_FILE = constants.TRANSCRIPT_FILE
TOPIC_MAP = constants.TOPIC_MAP
PARAPHRASE_MAP = constants.PARAPHRASE_MAP

QPA_ORDER = ["Topics", "Helpers", "Mentor", "Question", "text"]

DATA_DIR = os.environ["DATA_MOUNT"] or os.getcwd()


def build_data(mentor):
    """
    This function builds the questions_paraphrases_answers.csv and prompts_utterances.csv
    file by leveraging data from the transcript.csv file, the master_question_topic_map.csv,
    and the master_question_paraphrase_map.csv
    """
    print("INFO: Getting Transcript Data")
    transcript_data = aggregate_transcript_data(mentor)
    if transcript_data.empty:
        print("ERROR: Couldn't Find Transcript Data")
    print("INFO: Getting Timestamp Data")
    timestamp_data = aggregate_timestamp_data(mentor)
    if timestamp_data.empty:
        print("ERROR: Couldn't Find Timestamp Data")
    print("INFO: Splitting Answers and Utterances")
    qpa_data, pu_data = split_answers_and_utterances(transcript_data, timestamp_data)
    if qpa_data.empty or pu_data.empty:
        print("ERROR: Couldn't Split Answers and Utterances Data")
    print("INFO: Saving QPA and PU Data")
    format_and_save_qpa_data(mentor, qpa_data)
    format_and_save_pu_data(mentor, pu_data)


def format_and_save_pu_data(mentor, pu_data):
    # Situation
    pu_data["Situation"] = ""
    for question in pu_data["Question"]:
        if question == "Long bio":
            pu_data.loc[pu_data["Question"] == question, "Situation"] = "_INTRO_"
        else:
            pu_data.loc[pu_data["Question"] == question, "Situation"] = "_FEEDBACK_"
    pu_data["Mentor"] = mentor
    pu_data["Utterance/Prompt"] = pu_data["text"]
    del pu_data["text"]
    del pu_data["Question"]
    target_dir = os.path.join(DATA_DIR, MENTOR_DATA.format(mentor))
    os.makedirs(target_dir, exist_ok=True)
    pu_data.to_csv(os.path.join(target_dir, PU_FILENAME))


def format_and_save_qpa_data(mentor, qpa_data):
    # Topic
    topic_map = get_master_map(os.path.join(DATA_DIR, SHARED_DATA, TOPIC_MAP))
    if topic_map.empty:
        qpa_data["Topics"] = "Advice"
    else:
        qpa_data = qpa_data.join(topic_map.set_index("Question"), on="Question")
    # Helpers, Mentor
    qpa_data["Helpers"] = ""
    qpa_data["Mentor"] = mentor
    qpa_data = qpa_data.reindex(columns=QPA_ORDER)
    # Paraphrase
    paraphrase_map = get_master_map(os.path.join(DATA_DIR, SHARED_DATA, PARAPHRASE_MAP))
    if not paraphrase_map.empty:
        qpa_data = qpa_data.join(paraphrase_map.set_index("Question"), on="Question")
    qpa_data.set_index("Question", inplace=True)
    target_dir = os.path.join(DATA_DIR, MENTOR_DATA.format(mentor))
    os.makedirs(target_dir, exist_ok=True)
    qpa_data.to_csv(os.path.join(target_dir, QPA_FILENAME))


def split_answers_and_utterances(transcript_data, timestamp_data):
    qpa_data = pd.DataFrame(columns=["Question", "text"])
    pu_data = pd.DataFrame(columns=["Question", "text"])
    for question in transcript_data["Question"]:
        timestamp_row = timestamp_data.loc[timestamp_data["Question"] == question]
        transcript_row = transcript_data.loc[transcript_data["Question"] == question]
        if timestamp_row["Answer/Utterance"].values[0] == "A":
            qpa_data = pd.concat([qpa_data, transcript_row])
        else:
            pu_data = pd.concat([pu_data, transcript_row])
    return qpa_data, pu_data


def aggregate_timestamp_data(mentor):
    session_exists = True
    session = 1
    while session_exists:
        file_exists = True
        part = 1
        while file_exists:
            filename = os.path.join(
                DATA_DIR,
                MENTOR_BUILD.format(mentor),
                SESSION_DATA.format(session),
                DATA_FILENAME.format(part, TIMESTAMP_FILE),
            )
            if os.path.isfile(filename):
                if session == 1 & part == 1:
                    timestamp_data = get_timestamp_data(filename)
                else:
                    timestamp_data = pd.concat(
                        [timestamp_data, get_timestamp_data(filename)]
                    )
                part += 1
            else:
                if part == 1:
                    session_exists = False
                file_exists = False
                session += 1

    return timestamp_data


def get_timestamp_data(timestamp_file):
    timestamp_data = pd.read_csv(
        timestamp_file, usecols=["Answer/Utterance", "Question"]
    )
    return timestamp_data


TRANSCRIPT_DATA_COLUMNS = ["Question", "text"]


def aggregate_transcript_data(mentor):
    session = 1
    qpa_data = pd.DataFrame(columns=TRANSCRIPT_DATA_COLUMNS)
    mentor_data_path = os.path.join(DATA_DIR, MENTOR_BUILD.format(mentor))
    while True:
        filename = os.path.join(
            mentor_data_path,
            SESSION_DATA.format(session),
            SESSION_OUTPUT,
            TRANSCRIPT_FILE,
        )
        if not os.path.isfile(filename):
            if len(qpa_data) < 1:
                print(f"WARNING: no transcript data found under {mentor_data_path}")
            return qpa_data
        qpa_data = (
            append_transcriptions_to_csv_data(filename)
            if session == 1
            else pd.concat([qpa_data, append_transcriptions_to_csv_data(filename)])
        )
        session += 1
    return qpa_data


def append_transcriptions_to_csv_data(transcript_file):
    return pd.read_csv(transcript_file, names=TRANSCRIPT_DATA_COLUMNS)


def get_master_map(map_file):
    map_data = pd.DataFrame()
    if os.path.isfile(map_file):
        map_data = pd.read_csv(map_file).fillna("")
    return map_data
