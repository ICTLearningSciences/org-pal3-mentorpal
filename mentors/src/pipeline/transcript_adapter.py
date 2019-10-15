import glob
import io
import logging
import os
from typing import Union
import pandas as pd
from yaml import load

try:
    from yaml import CLoader as YamlLoader
except ImportError:
    from yaml import YamlLoader

import constants
from mentor_data import MentorData
from utterances import UtteranceType

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

COLS_QUESTIONS_PARAPHRASES_ANSWERS = ["Topics", "Helpers", "Mentor", "Question", "text"]
COLS_PROMPTS_UTTERANCES = ["Situation", "Mentor", "Utterance/Prompt"]
COLS_TRANSCRIPT = ["Question", "text"]

DATA_DIR = os.path.abspath(os.environ.get("DATA_MOUNT") or os.getcwd())


def transcripts_to_training_data(
    mentor: str,
    data_dir: str = None,
    questions_paraphrases_answers_output: Union[str, io.StringIO] = None,
    prompts_utterances_output: Union[str, io.BytesIO] = None,
    log_warning_on_missing_utterance_types: bool = True,
) -> None:
    data_dir = os.path.abspath(data_dir or DATA_DIR)
    mentor_data = MentorData(mentor, os.path.join(data_dir, mentor))
    qpa_df, pu_df = _read_transcripts_to_data_frames(mentor_data)
    if log_warning_on_missing_utterance_types:
        missing_utterance_types = [
            utype
            for utype in UtteranceType.get_required_types()
            if not (pu_df["Situation"] == utype).any()
        ]
        if missing_utterance_types:
            logging.warning(
                f"no transcripts found for mentor {mentor} with these utterance types: {missing_utterance_types}"
            )
    target_dir_default = os.path.join(data_dir, MENTOR_DATA.format(mentor))
    questions_paraphrases_answers_output = (
        questions_paraphrases_answers_output
        or os.path.join(target_dir_default, QPA_FILENAME)
    )
    prompts_utterances_output = prompts_utterances_output or os.path.join(
        target_dir_default, PU_FILENAME
    )
    qpa_df.to_csv(questions_paraphrases_answers_output, mode="w", index=False)
    pu_df.to_csv(prompts_utterances_output, mode="w", index=False)


def _to_question_paraphrase_answer_row(mentor: str, question: str, answer: str) -> list:
    assert mentor is not None
    assert question is not None
    assert answer is not None
    return [None, None, mentor, question, answer]


def _read_transcripts_to_data_frames(
    mentor_data: MentorData
) -> (pd.DataFrame, pd.DataFrame):
    glob_path = f"{mentor_data.get_transcripts_root()}/*.yaml"
    qpa_rows = []
    pu_rows = []
    mentor_id = mentor_data.get_mentor_id()
    for t_path in sorted(glob.iglob(glob_path)):
        try:
            with open(t_path, "r") as f:
                t = load(f, Loader=YamlLoader)
                transcription = t.get("transcription")
                assert transcription is not None, "item must have a transcription"
                utterance_type = (
                    t.get("type")
                    if UtteranceType.is_valid(t.get("type"))
                    else UtteranceType.ANSWER
                )
                if utterance_type == UtteranceType.ANSWER:
                    question = t.get("question")
                    assert question is not None, "item must have question text"
                    qpa_rows.append([None, None, mentor_id, question, transcription])
                else:
                    pu_rows.append([utterance_type, mentor_id, transcription])
        except BaseException as err:
            logging.warning(f"failed to load transcript data from {t_path}: {err}")
    questions_paraphrases_answers = pd.DataFrame(
        qpa_rows, columns=COLS_QUESTIONS_PARAPHRASES_ANSWERS
    )
    prompts_utterances = pd.DataFrame(pu_rows, columns=COLS_PROMPTS_UTTERANCES)
    return questions_paraphrases_answers, prompts_utterances


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
    print("INFO: Splitting Answers and UtteranceMap")
    qpa_data, pu_data = split_answers_and_utterances(transcript_data, timestamp_data)
    if qpa_data.empty or pu_data.empty:
        print("ERROR: Couldn't Split Answers and UtteranceMap Data")
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
    qpa_data = qpa_data.reindex(columns=COLS_QUESTIONS_PARAPHRASES_ANSWERS)
    # Paraphrase
    paraphrase_map = get_master_map(os.path.join(DATA_DIR, SHARED_DATA, PARAPHRASE_MAP))
    if not paraphrase_map.empty:
        qpa_data = qpa_data.join(paraphrase_map.set_index("Question"), on="Question")
    qpa_data.set_index("Question", inplace=True)
    target_dir = os.path.join(DATA_DIR, MENTOR_DATA.format(mentor))
    os.makedirs(target_dir, exist_ok=True)
    qpa_data.to_csv(os.path.join(target_dir, QPA_FILENAME))


def split_answers_and_utterances(transcript_data, timestamp_data):
    qpa_data = pd.DataFrame(columns=COLS_TRANSCRIPT)
    pu_data = pd.DataFrame(columns=COLS_TRANSCRIPT)
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


def aggregate_transcript_data(mentor):
    session = 1
    qpa_data = pd.DataFrame(columns=COLS_TRANSCRIPT)
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
    return pd.read_csv(transcript_file, names=COLS_TRANSCRIPT)


def get_master_map(map_file):
    map_data = pd.DataFrame()
    if os.path.isfile(map_file):
        map_data = pd.read_csv(map_file).fillna("")
    return map_data
