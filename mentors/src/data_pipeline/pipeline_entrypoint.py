import argparse
import os
import csv

from preprocess_data import process_raw_data
import ibm_transcript_service as transcript_service

"""
This file serves as the entrypoint for the mentor panel video pipeline
"""
RECORDINGS_FILEPATH = "recordings"

# def check_mentor_data():


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
        help="session numbers to process, or 'all' to process all sessions",
    )
    args = parser.parse_args()

    # Check if mentor recordings exist locally
    # TODO: Check for sessions
    mentor_dir = os.path.join(os.getcwd(), RECORDINGS_FILEPATH, args.mentor)
    if not os.path.exists(mentor_dir):
        if args.url:
            print("ERROR: This feature is currently unsupported")
        else:
            print(
                "ERROR: Audiofiles for {} don't exist locally and url is not provided".format(
                    args.mentor
                )
            )
            return

    if args.sessions:
        for session in args.sessions:
            session_dir = os.path.join(mentor_dir, "session" + session)
            print(session_dir)
            process_raw_data(session_dir)


if __name__ == "__main__":
    main()
