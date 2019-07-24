import os
import pandas as pd

"""
This script will adapt the transcript.csv into questions_paraphrases_answers.csv
The transcript.csv file is output by the data pre-processing stage of our data
pipeline.  which is output by our data
pre-processing stage
"""
QPA_ORDER = ["Topics", "Helpers", "Mentor", "Question", "text"]
DATA_FOLDER = "data"
TOPIC_MAP_FILE = os.path.join(DATA_FOLDER, "master_topic_map.csv")
PARAPHRASE_MAP_FILE = os.path.join(DATA_FOLDER, "master_paraphrase_map.csv")
QPA_TARGET_FILE = os.path.join(DATA_FOLDER, "questions_paraphrases_answers.csv")
PU_TARGET_FILE = os.path.join(DATA_FOLDER, "prompts_utterances.csv")
TIMESTAMP_FILE = os.path.join(
    DATA_FOLDER, "recordings/{}/session{}/part{}_timestamps.csv"
)


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
    if qpa_data.empty and pu_data.empty:
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

    pu_data.to_csv(os.path.join(os.getcwd(), PU_TARGET_FILE))


def format_and_save_qpa_data(mentor, qpa_data):
    # Topic
    topic_map = get_master_map(TOPIC_MAP_FILE)
    qpa_data = qpa_data.join(topic_map.set_index("Question"), on="Question")

    # Helpers, Mentor
    qpa_data["Helpers"] = ""
    qpa_data["Mentor"] = mentor
    qpa_data = qpa_data.reindex(columns=QPA_ORDER)

    # Paraphrase
    paraphrase_map = get_master_map(PARAPHRASE_MAP_FILE)
    qpa_data = qpa_data.join(paraphrase_map.set_index("Question"), on="Question")

    qpa_data.set_index("Question", inplace=True)
    qpa_data.to_csv(os.path.join(os.getcwd(), QPA_TARGET_FILE))


def split_answers_and_utterances(transcript_data, timestamp_data):
    qpa_data = pd.DataFrame()
    pu_data = pd.DataFrame()

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
            filename = TIMESTAMP_FILE.format(mentor, session, part)
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
    # Transcript
    transcript_exists = True
    session = 1

    while transcript_exists:
        filename = "data/recordings/{}/session{}/out/transcript.csv".format(
            mentor, session
        )
        if os.path.isfile(filename):
            if session == 1:
                qpa_data = get_transcript_data(filename)
            else:
                qpa_data = pd.concat([qpa_data, get_transcript_data(filename)])
            session += 1
        else:
            transcript_exists = False

    return qpa_data


def get_transcript_data(transcript_file):
    os.path.join(os.getcwd(), transcript_file)
    transcript_file = pd.read_csv(transcript_file, names=["Question", "text"])
    return transcript_file


def get_master_map(map_file):
    os.path.join(os.getcwd(), map_file)
    map_data = pd.read_csv(map_file).fillna("")
    return map_data
