import argparse
import os
import csv

import preprocess_data
import ibm_transcript_service as transcript_service

"""
This file serves as the entrypoint for the mentor panel video processing pipeline
"""
RECORDINGS_FILEPATH = "recordings"


def process_session_data(sessions, mentor_dir):
    """
    Process raw session data by leveraging preprocess_data script

    Parameters:
    sessions: list of session numbers to process (or 'all')
    mentor_dir: directory containing raw data for mentor
    """
    if sessions:
        for session in sessions:
            if session == "all":
                session_number = 1
                session_dir = get_session_dir(mentor_dir, session_number)
                while os.path.isdir(session_dir):
                    session_number += 1
                    preprocess_data.process_raw_data(session_dir)
                    session_dir = get_session_dir(mentor_dir, session_number)
            else:
                session_dir = get_session_dir(mentor_dir, session_number)
                preprocess_data.process_raw_data(session_dir)


def get_session_dir(mentor_dir, session_number):
    return os.path.join(mentor_dir, "session{}".format(session_number))


def get_mentor_data(mentor, url):
    """
    Get directory of mentor data, download if necessary

    Parameters:
    mentor: name of mentor
    mentor_dir: url of mentor data
    """
    mentor_dir = os.path.join(os.getcwd(), RECORDINGS_FILEPATH, mentor)
    if not os.path.exists(mentor_dir):
        if url:
            print("ERROR: This feature is currently unsupported")
        else:
            print(
                "ERROR: Audiofiles for {} don't exist locally and url is not provided".format(
                    args.mentor
                )
            )
            mentor_dir = None

    return mentor_dir


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
        "-t",
        "--transcripts",
        action="store_true",
        help="enable generation of transcripts",
    )
    parser.add_argument(
        "-s",
        "--sessions",
        nargs="+",
        default=["all"],
        help="session numbers to process, or 'all' to process all sessions",
    )
    args = parser.parse_args()

    print("INFO: Collecting data for {}".format(args.mentor))
    mentor_dir = get_mentor_data(args.mentor, args.url)
    if mentor_dir:
        print("INFO: Processing session data for {}".format(args.mentor))
        process_session_data(args.sessions, mentor_dir)


if __name__ == "__main__":
    main()
