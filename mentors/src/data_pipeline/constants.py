import os

DATA_DIR = "data"
RECORDINGS_DIR = os.path.join(DATA_DIR, "recordings")
OUTPUT_DIR = "out"
AUDIOCHUNK_DIR = os.path.join(OUTPUT_DIR, "audiochunks")
MENTOR_DIR = os.path.join(RECORDINGS_DIR, "{}")
SESSION_DIR = os.path.join(MENTOR_DIR, "{}")

FILENAME = "part{}_{}"
VIDEO_FILE = "video.mp4"
AUDIO_FILE = "audio.wav"
TIMESTAMP_FILE = "timestamps.csv"
TRANSCRIPT_FILE = os.path.join(OUTPUT_DIR, "transcript.csv")
TOPIC_MAP_FILE = os.path.join(DATA_DIR, "master_topic_map.csv")
PARAPHRASE_MAP_FILE = os.path.join(DATA_DIR, "master_paraphrase_map.csv")
QPA_FILE = os.path.join(DATA_DIR, "questions_paraphrases_answers.csv")
PU_FILE = os.path.join(DATA_DIR, "prompts_utterances.csv")
