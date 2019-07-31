import os

SHARED_DATA = "data"
MENTOR_DATA = "{}/data"
MENTOR_BUILD = "{}/build"
SESSION_DATA = "recordings/session{}"
SESSION_OUTPUT = "out"
AUDIOCHUNKS = "audiochunks"

DATA_FILENAME = "part{}_{}"
VIDEO_FILE = "video.mp4"
AUDIO_FILE = "audio.wav"
TIMESTAMP_FILE = "timestamps.csv"
TOPIC_MAP = "master_topic_map.csv"
PARAPHRASE_MAP = "master_paraphrase_map.csv"

PU_FILENAME = "prompts_utterances.csv"
QPA_FILENAME = "questions_paraphrases_answers.csv"
TRANSCRIPT_FILE = "transcript.csv"


def convert_to_seconds(time):
    """
    Converts a timestamp from HH:MM:SS or MM:SS to seconds.
    For example, a time 01:03:45 is 01*3600 + 03*60 + 45 = 3825 seconds

    Parameters:
    time: time string
    """
    time_adjustments = [3600, 60, 1]
    time_split = time.split(":")
    if len(time_split) == 2:  # TODO: Remove this when data is standardized
        time_split.insert(0, 00)
    result = sum(s * int(a) for s, a in zip(time_adjustments, time_split))
    return result
