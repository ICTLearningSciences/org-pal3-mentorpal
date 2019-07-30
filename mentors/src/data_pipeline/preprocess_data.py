import ffmpy
import csv
import os
import fnmatch
import pandas as pd

import ibm_transcript_service as transcript_service
import utils


TRANSCRIPT_FILE = utils.TRANSCRIPT_FILE
VIDEO_FILE = utils.VIDEO_FILE
AUDIO_FILE = utils.AUDIO_FILE
TIMESTAMP_FILE = utils.TIMESTAMP_FILE
FILENAME = utils.DATA_FILENAME
SESSION_OUTPUT = utils.SESSION_OUTPUT
AUDIOCHUNKS = utils.AUDIOCHUNKS


def convert_to_wav(input_file, output_file):
    """
    Converts the .mp4 file to a .ogg file.
    Later, this .ogg file is split into smaller chunks for each Q-A pair.
    This is done because we want transcriptions for each question and the interview contains
    lots of other content like general talking and discussions.
    We use the timestamps for each Q-A to split the .ogg file.
    This function is equivalent to running `ffmpeg -i input_file output_file -loglevel quiet` on the command line.

    Parameters:
    input_file: Examples are /example/path/to/session1/session1part1.mp4, /example/path/to/session1/session1part2.mp4
    output_file: Examples are /example/path/to/session1/session1part1.ogg, /example/path/to/session1/session1part2.ogg

    Returns:
    error_code: if conversion fails, return 1
    """
    error_code = 0

    if os.path.exists(input_file):
        output_command = "-loglevel quiet -y"
        ff = ffmpy.FFmpeg(
            inputs={input_file: None}, outputs={output_file: output_command}
        )
        ff.run()
    else:
        print("ERROR: Can't chunk audio, {} doesn't exist".format(input_file))
        error_code = 1

    return error_code


def ffmpeg_split_audio(audiochunks, input_file, index, start_time, end_time):
    """
    Splits the large .ogg file into chunks based on the start_time and end_time of chunk.
    Chunks are stored in the audiochunks folder based on the ID of the Q-A pair.
    This function is equivalent to running `ffmpeg -i input_file -ss start_time -to end_time output_file -loglevel quiet` on the command line.
    FFMpeg will automatically recognize whether the result must be audio or video, based on the extension of the output_file.

    Parameters:
    audiochunks: audiochunks directory /example/path/to/session1/audiochunks
    input_file: /example/path/to/session1/session1part1.ogg, /example/path/to/session1/session1part2.ogg
    index: question number
    start_time: audiochunk start time (in seconds from the start of the video)
    end_time: audiochunk end time (in seconds from the start of the video)
    """
    output_file = os.path.join(audiochunks, "q{}.ogg".format(index))
    output_command = "-ss {} -to {} -c:a libvorbis -q:a 5 -loglevel quiet".format(
        start_time, end_time
    )
    ff = ffmpy.FFmpeg(inputs={input_file: None}, outputs={output_file: output_command})
    ff.run()


def split_into_chunks(audiochunks, audio_file, timestamps, offset):
    """
    Reads timestamps from file and call ffmpeg_split_audio() to split the large .wav file on timestamps.

    Parameters:
    audiochunks: audiochunks directory /example/path/to/session1/audiochunks
    audio_file: /example/path/to/session1/session1part1.wav, /example/path/to/session1/session1part2.wav
    timestamps: /example/path/to/session1/session1part1_timestamps.csv, /example/path/to/session1/session1part2_timestamps.csv
    offset: If a session has more than one recorded video, the offset will indicate how many questions
            was seen till the end of the previous session. If we have two sessions and the first one
            had 25 questions, then the offset will be 26 when the second session is processed.
    """
    start_times = []
    end_times = []
    questions = []

    # Pandas reads empty cells as 0, replace with empty string
    timestamps_file = pd.read_csv(timestamps).fillna("")

    for i in range(0, len(timestamps_file)):
        questions.append(timestamps_file.iloc[i]["Question"])
        start_times.append(timestamps_file.iloc[i]["Response start"])
        end_times.append(timestamps_file.iloc[i]["Response end"])

    start_times = [utils.convert_to_seconds(time) for time in start_times]
    end_times = [utils.convert_to_seconds(time) for time in end_times]

    for i in range(0, len(start_times)):
        ffmpeg_split_audio(
            audiochunks, audio_file, offset + i, start_times[i], end_times[i]
        )
    return questions


def get_transcript(session_dir, questions, offset):
    """
    Call transcript service to get transcript for each audiochunk and append to
    the transcript file. This function is called once per part of the session.
    The offset variable handles sessions with multiple parts.

    Parameters:
    session_dir: session directory /example/path/to/session1
    audiochunks: audiochunks directory /example/path/to/session1/audiochunks
    questions: list of questions which was returned by the split_into_chunks(...) function
    offset: Question number offset as described before
    """
    with open(
        os.path.join(session_dir, SESSION_OUTPUT, TRANSCRIPT_FILE), "a"
    ) as transcript_csv:
        csvwriter = csv.writer(transcript_csv)

        for i in range(0, len(questions)):
            ogg_file = os.path.join(
                session_dir, SESSION_OUTPUT, AUDIOCHUNKS, "q{}.ogg".format(offset + i)
            )
            transcript = transcript_service.generate_transcript(ogg_file)

            if not transcript:
                print("ERROR: Could not connect to IBM Watson")
                return 0
            else:
                print("DEBUG: {}".format(transcript))
                csvwriter.writerow([questions[i], transcript])
        return 1


def flatten_list(l):
    return [item for sublist in l for item in sublist]


def process_raw_data(transcripts, session_dir, session_number):
    process_summary = {"transcripts": [], "audiochunks": []}

    # Finds out how many parts are there in the session
    number_of_parts = len(fnmatch.filter(os.listdir(session_dir), "*.mp4"))

    if not number_of_parts > 0:
        print("WARNING: Session {} contains no files".format(session_number))
        return
    else:
        print("INFO: Started processing Session {}".format(session_number))

    for i in range(number_of_parts):
        part = i + 1
        video_file = os.path.join(session_dir, FILENAME.format(part, VIDEO_FILE))
        audio_file = os.path.join(session_dir, FILENAME.format(part, AUDIO_FILE))
        timestamps = os.path.join(session_dir, FILENAME.format(part, TIMESTAMP_FILE))
        audiochunks = os.path.join(session_dir, SESSION_OUTPUT, AUDIOCHUNKS)
        offset = 0

        # Create audiochunks directory if it doesn't exist.
        if not os.path.isdir(audiochunks):
            os.makedirs(audiochunks)
        # if audiochunks directory exists, then there is an offset
        else:
            offset = len(fnmatch.filter(os.listdir(audiochunks), "*.ogg"))
        print("INFO: Processing part {}".format(i + 1))
        print("INFO: Converting video to audio")
        if convert_to_wav(video_file, audio_file):
            continue
        print("INFO: Chunking the audio into smaller parts")
        questions = split_into_chunks(audiochunks, audio_file, timestamps, offset)
        if questions:
            process_summary["audiochunks"].append(
                "s{} p{}".format(session_number, part)
            )
        if transcripts:
            print("INFO: Getting transcripts from IBM Watson")
            if get_transcript(session_dir, questions, offset):
                process_summary["transcripts"].append(
                    "s{} p{}".format(session_number, part)
                )
            else:
                transcripts = False

    return process_summary
