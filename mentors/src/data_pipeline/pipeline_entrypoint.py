import argparse
import os
import requests

import constants
import preprocess_data
import post_process_data
import transcript_adapter
import caption_generator

"""
This file serves as the entrypoint for the mentor panel video processing pipeline
"""
MENTOR_BUILD = constants.MENTOR_BUILD
MENTOR_DATA = constants.MENTOR_DATA
MENTOR_VIDEOS = constants.MENTOR_VIDEOS
SESSION_DATA = constants.SESSION_DATA
ANSWER_VIDEOS = constants.ANSWER_VIDEOS
DATA_FILENAME = constants.DATA_FILENAME
VIDEO_FILE = constants.VIDEO_FILE
AUDIO_FILE = constants.AUDIO_FILE
TIMESTAMP_FILE = constants.TIMESTAMP_FILE
CLASSIFIER_DATA = constants.CLASSIFIER_DATA
ERR_MISSING_FILE = "ERROR: Missing {} file for session {} part {}"
ERR_NO_URL = "ERROR: Data files for {} don't exist locally and url is not provided"

DATA_DIR = os.environ["DATA_MOUNT"] or os.getcwd()


def process_session_data(args):
    """
    Process raw session data by leveraging preprocess_data script

    Parameters:
    sessions: list of session numbers to process (or 'all')
    mentor_dir: directory containing raw data for mentor
    """
    process_summary = {"transcripts": [], "audiochunks": []}
    mentor_dir = os.path.join(DATA_DIR, MENTOR_BUILD.format(args.mentor))

    if args.sessions:
        for session in args.sessions:
            if session == "all":
                session_number = 1
                session_dir = get_session_dir(mentor_dir, session_number)
                while os.path.isdir(session_dir):
                    summary = preprocess_data.process_raw_data(
                        args.transcripts, session_dir, session_number
                    )
                    session_number += 1
                    session_dir = get_session_dir(mentor_dir, session_number)
                    process_summary["transcripts"].extend(summary["transcripts"])
                    process_summary["audiochunks"].extend(summary["audiochunks"])
            else:
                session_dir = get_session_dir(mentor_dir, session)
                summary = preprocess_data.process_raw_data(
                    args.transcripts, session_dir, session
                )
                process_summary["transcripts"].extend(summary["transcripts"])
                process_summary["audiochunks"].extend(summary["audiochunks"])

    return process_summary


def get_session_dir(mentor_dir, session_number):
    return os.path.join(mentor_dir, SESSION_DATA.format(session_number))


def get_mentor_data(args):
    """
    Get directory of mentor data, download if necessary

    Parameters:
    args: script input arguments

    Returns:
    data_present: True if mentor data is locally available
    """
    data_present = True
    mentor_build_path = MENTOR_BUILD.format(args.mentor)
    # Check if first session folder exists to see if any data is present
    if not os.path.exists(
        os.path.join(DATA_DIR, mentor_build_path, SESSION_DATA.format(1))
    ):
        if args.url:
            print("INFO: Mentor data not found locally. Downloading from S3.")
            data_present = download_mentor_data(args.url, args.mentor)
        else:
            print(ERR_NO_URL.format(args.mentor))
            data_present = False

    return data_present


def download_mentor_data(url, mentor):
    """
    This function controls the download of mentor data. Iterate through all
    parts of all sessions. If download of a part fails, move to beginning of the
    the next session. If download of the first part in a session fails, return.

    Parameters:
    url: address pointing to the top level of raw files for a single mentor
    mentor: mentor name

    Returns:
    download_successful: True if some data has been downloaded
    """
    download_successful = True
    session = 0
    session_found = True

    while session_found:
        session += 1
        part = 0
        part_found = True

        while part_found:
            part += 1
            print(f"INFO: Downloading session {session} part {part} data (if exists)")
            t_session_flag, t_part_flag = download_session_data(
                url, mentor, session, part, TIMESTAMP_FILE
            )
            v_session_flag, v_part_flag = download_session_data(
                url, mentor, session, part, VIDEO_FILE
            )
            a_session_flag, a_part_flag = download_session_data(
                url, mentor, session, part, AUDIO_FILE
            )
            part_found = t_part_flag & v_part_flag & a_part_flag
            session_found = t_session_flag & v_session_flag & a_session_flag
            if not session_found:
                print(f"INFO: Session {session} not found")
            elif not part_found:
                print(f"INFO: Session {session} part {part} not found")

    if session == 1 and part == 1:
        download_successful = False
    return download_successful


def download_session_data(url, mentor, session, part, filename):
    """
    This function performs the download of mentor data. If target directory does
    not exist, create target directory. If download fails, return part_found=False.
    If download fails on first part, also return session_found=False.

    Parameters:
    url: address pointing to the top level of raw files for a single mentor
    mentor: mentor name
    session: session number
    part: part number
    filename: ""
    """
    session_found = True
    part_found = True
    save_dir = os.path.join(
        DATA_DIR, MENTOR_BUILD.format(mentor), SESSION_DATA.format(session)
    )
    save_path = os.path.join(save_dir, DATA_FILENAME.format(part, filename))
    res = requests.get(
        os.path.join(
            url,
            MENTOR_DATA.format(mentor),
            SESSION_DATA.format(session),
            DATA_FILENAME.format(part, filename),
        )
    )
    if res.status_code == 200:
        if not os.path.isdir(save_dir):
            os.makedirs(save_dir)
        open(save_path, "wb").write(res.content)
    else:
        if part == 1:
            session_found = False
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
        "-a",
        "--audiochunks",
        action="store_true",
        help="enable generation of audiochunks",
    )
    parser.add_argument(
        "-c",
        "--captions",
        action="store_true",
        help="enable generation of classification data csv file",
    )
    parser.add_argument(
        "-d",
        "--classification_data",
        action="store_true",
        help="enable generation of classification data csv file",
    )
    parser.add_argument(
        "-m",
        "--mentor",
        required=True,
        help="enter the name of the mentor you want to process",
    )
    parser.add_argument(
        "-q",
        "--qpa_pu_data",
        action="store_true",
        help="enable generation of questions_paraphrase_answers and prompts_utterances csv file",
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
        "-t",
        "--transcripts",
        action="store_true",
        help="enable generation of transcripts",
    )
    parser.add_argument(
        "-v", "--videos", action="store_true", help="enable generation of videos"
    )
    args = parser.parse_args()

    if args.audiochunks or args.transcripts:
        print("INFO: Collecting data for {}".format(args.mentor))
        if get_mentor_data(args):
            print("INFO: Processing session data for {}".format(args.mentor))
            summary = process_session_data(args)
            print_preprocess_summary(summary)

    if args.qpa_pu_data:
        print(
            "INFO: Building Questions Paraphrases Answers and Prompts Utterance Files"
        )
        transcript_adapter.build_data(args.mentor)

    if args.classification_data:
        print("INFO: Building Classification Data")
        post_process_data.build_post_processing_data(args)

    if args.captions:
        print("INFO: Building Captions")
        classifer_data_path = os.path.join(
            DATA_DIR, MENTOR_DATA.format(args.mentor), CLASSIFIER_DATA
        )
        answer_video_path = os.path.join(
            DATA_DIR, MENTOR_VIDEOS.format(args.mentor), ANSWER_VIDEOS
        )
        caption_generator.generate_captions(answer_video_path, classifer_data_path)


if __name__ == "__main__":
    main()
