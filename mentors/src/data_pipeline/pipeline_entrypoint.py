import argparse
import os
import requests

import preprocess_data
import utils

"""
This file serves as the entrypoint for the mentor panel video processing pipeline
"""
RECORDINGS_PATH = "recordings"
SESSION_PATH = "session{}"
FILE_PATH = SESSION_PATH + "/part{}_{}"
VIDEO_FILE = utils.VIDEO_FILE
AUDIO_FILE = utils.AUDIO_FILE
TIMESTAMP_FILE = utils.TIMESTAMP_FILE
ERR_MISSING_FILE = "ERROR: Missing {} file for session {} part {}"
ERR_NO_URL = "ERROR: Data files for {} don't exist locally and url is not provided"


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
                session_dir = get_session_dir(mentor_dir, session)
                preprocess_data.process_raw_data(session_dir)


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
    session_found = True
    part_found = True

    save_dir = os.path.join(mentor_dir, SESSION_PATH.format(session))
    save_path = os.path.join(mentor_dir, FILE_PATH.format(session, part, filename))
    full_url = os.path.join(url, FILE_PATH.format(session, part, filename))
    print("DEBUG: Full URL {}".format(full_url))
    res = requests.get(full_url)
    print("DEBUG: Status Code {}".format(res.status_code))
    if res.status_code == 200:
        if not os.path.isdir(save_dir):
            os.makedirs(save_dir)
        open(save_path, "wb").write(res.content)
    else:
        if part == 1:
            print("WARN: Session {} not found".format(session))
            part_found = False
            session_found = False
        else:
            print(
                "WARN: Session {} part {} {} not found".format(session, part, filename)
            )
            part_found = False

    return session_found, part_found


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
    mentor_dir = get_mentor_data(args)
    if mentor_dir:
        print("INFO: Processing session data for {}".format(args.mentor))
        process_session_data(args.sessions, mentor_dir)


if __name__ == "__main__":
    main()
