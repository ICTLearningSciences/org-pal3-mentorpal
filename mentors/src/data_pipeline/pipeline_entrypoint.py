import argparse
import os
import requests

import preprocess_data
import transcript_adapter
import constants

"""
This file serves as the entrypoint for the mentor panel video processing pipeline
"""
RECORDINGS_PATH = "data/recordings"
SESSION_PATH = "session{}"
FILE_PATH = os.path.join(SESSION_PATH, "part{}_{}")
VIDEO_FILE = constants.VIDEO_FILE
AUDIO_FILE = constants.AUDIO_FILE
TIMESTAMP_FILE = constants.TIMESTAMP_FILE
ERR_MISSING_FILE = "ERROR: Missing {} file for session {} part {}"
ERR_NO_URL = "ERROR: Data files for {} don't exist locally and url is not provided"


def process_session_data(args, mentor_dir):
    """
    Process raw session data by leveraging preprocess_data script

    Parameters:
    sessions: list of session numbers to process (or 'all')
    mentor_dir: directory containing raw data for mentor
    """
    process_summary = {"transcripts": [], "audiochunks": []}

    if args.sessions:
        for session in args.sessions:
            if session == "all":
                session_number = 1
                session_dir = get_session_dir(mentor_dir, session_number)
                while os.path.isdir(session_dir):
                    session_number += 1
                    summary = preprocess_data.process_raw_data(
                        args.transcripts, session_dir
                    )
                    session_dir = get_session_dir(mentor_dir, session_number)
                    process_summary["transcripts"].extend(summary["transcripts"])
                    process_summary["audiochunks"].extend(summary["audiochunks"])
            else:
                session_dir = get_session_dir(mentor_dir, session)
                summary = preprocess_data.process_raw_data(
                    args.transcripts, session_dir
                )
                process_summary["transcripts"].extend(summary["transcripts"])
                process_summary["audiochunks"].extend(summary["audiochunks"])

    return process_summary


def get_session_dir(mentor_dir, session_number):
    return os.path.join(mentor_dir, "session{}".format(session_number))


def get_mentor_data(args):
    """
    Get directory of mentor data, download if necessary

    Parameters:
    mentor: name of mentor
    mentor_dir: url of mentor data
    """
    mentor_dir = os.path.join(os.getcwd(), RECORDINGS_PATH, args.mentor)
    if not os.path.exists(mentor_dir):
        if args.url:
            print("INFO: Mentor data not found locally. Downloading from S3.")
            download_mentor_data(args.url, mentor_dir)
        else:
            print(ERR_NO_URL.format(args.mentor))
            mentor_dir = None

    return mentor_dir


def download_mentor_data(url, mentor_dir):
    """
    This function controls the download of mentor data. Iterate through all
    parts of all sessions. If download of a part fails, move to beginning of the
    the next session. If download of the first part in a session fails, return.

    Parameters:
    url: address pointing to the top level of raw files for a single mentor
    mentor_dir: target directory to store mentor files locally
    """
    session = 1
    session_found = True

    while session_found:
        part = 1
        part_found = True

        while part_found:
            print("INFO: Downloading session {} part {}".format(session, part))
            t_session_flag, t_part_flag = download_session_data(
                url, mentor_dir, session, part, TIMESTAMP_FILE
            )
            v_session_flag, v_part_flag = download_session_data(
                url, mentor_dir, session, part, VIDEO_FILE
            )
            a_session_flag, a_part_flag = download_session_data(
                url, mentor_dir, session, part, AUDIO_FILE
            )
            part_found = t_part_flag & v_part_flag & a_part_flag
            session_found = t_session_flag & v_session_flag & a_session_flag
            part += 1

        session += 1


def download_session_data(url, mentor_dir, session, part, filename):
    """
    This function performs the download of mentor data. If target directory does
    not exist, create target directory. If download fails, return part_found=False.
    If download fails on first part, also return session_found=False.

    Parameters:
    url: address pointing to the top level of raw files for a single mentor
    mentor_dir: target directory to store mentor files locally
    session: session number
    part: part number
    filename: ""
    """
    session_found = True
    part_found = True

    save_dir = os.path.join(mentor_dir, SESSION_PATH.format(session))
    save_path = os.path.join(mentor_dir, FILE_PATH.format(session, part, filename))
    res = requests.get(os.path.join(url, FILE_PATH.format(session, part, filename)))
    if res.status_code == 200:
        if not os.path.isdir(save_dir):
            os.makedirs(save_dir)
        open(save_path, "wb").write(res.content)
    else:
        if part == 1:
            print(
                "WARN: Session {} part {} {} not found".format(session, part, filename)
            )
            part_found = False
            session_found = False
        else:
            print(
                "WARN: Session {} part {} {} not found".format(session, part, filename)
            )
            part_found = False

    return session_found, part_found


def print_preprocess_summary(summary):
    print("Video Pre-processing Complete")
    print("")
    print("SUMMARY:")
    print("")
    print("Audiochunks Generated: ")
    print(summary["audiochunks"])
    print("Transcripts Generated: ")
    print(summary["transcripts"])
    if not summary["transcripts"]:
        print(
            "WARN: If transcripts were requested, please check that your Watson credentials file exists."
        )


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-m",
        "--mentor",
        required=True,
        help="enter the name of the mentor you want to process",
    )
    parser.add_argument("-u", "--url", help="location of raw video and timestamp files")
    parser.add_argument(
        "-s",
        "--sessions",
        nargs="+",
        default=["all"],
        help="session numbers to process, or 'all' to process all sessions",
    )
    parser.add_argument(
        "-a",
        "--audiochunks",
        action="store_true",
        help="enable generation of audiochunks",
    )
    parser.add_argument(
        "-t",
        "--transcripts",
        action="store_true",
        help="enable generation of transcripts",
    )
    parser.add_argument(
        "-q",
        "--qpa_pu_data",
        action="store_true",
        help="enable generation of questions_paraphrase_answers and prompts_utterances csv file",
    )
    args = parser.parse_args()

    if args.audiochunks or args.transcripts:
        print("INFO: Collecting data for {}".format(args.mentor))
        mentor_dir = get_mentor_data(args)

        if mentor_dir:
            print("INFO: Processing session data for {}".format(args.mentor))
            summary = process_session_data(args, mentor_dir)
            print_preprocess_summary(summary)

    if args.qpa_pu_data:
        print(
            "INFO: Building Questions Paraphrases Answers and Prompts Utterance Files"
        )
        transcript_adapter.build_data(args.mentor)


if __name__ == "__main__":
    main()
