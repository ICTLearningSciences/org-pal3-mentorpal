import os

VIDEO_FILE = "video.mp4"
AUDIO_FILE = "audio.wav"
TIMESTAMP_FILE = "timestamps.csv"
OUTPUT_DIR = "out"
TRANSCRIPT_FILE = os.path.join(OUTPUT_DIR, "transcript.csv")
AUDIOCHUNK_DIR = os.path.join(OUTPUT_DIR, "audiochunks")
FILENAME = "part{}_{}"
