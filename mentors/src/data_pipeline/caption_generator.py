import subprocess
import pandas as pd
import os
import math
import ffmpy
import utils


def find(s, ch):  # gives indexes of all of the spaces so we don't split words apart
    return [i for i, ltr in enumerate(s) if ltr == ch]


def get_durations(row_id, video_path):
    time = None
    try:
        input_file = os.path.join(video_path, row_id + """.mp4""")
        ff = ffmpy.FFprobe(inputs={input_file: None})
        stdout, stderr = ff.run(stdout=subprocess.PIPE, stderr=subprocess.STDOUT)
        status_string = stdout.decode()
        a = int(status_string.find("Duration:"))
        print(status_string)
        time = utils.convert_to_seconds(status_string[a + 10 : a + 21])  # gets the duration
    except (ValueError, IndexError):
        print("Video not Found")
    return time

def generate_captions(video_path, classifier_data_path):
    df = pd.read_csv(classifier_data_path, encoding="cp1252")
    output = pd.DataFrame()

    for i in range(len(df["ID"])):
        row_id = str(df["ID"][i])  # gets the ith value
        time = get_durations(row_id, video_path)
        if not time:
            continue
        transcript = str(df["text"][i])
        piece_length = 68
        word_indices = find(transcript, " ")
        split_index = [0]
        for k in range(1, len(word_indices)):
            for l in range(1, len(word_indices)):
                if word_indices[l] > piece_length * k:
                    split_index.append(word_indices[l])
                    break
        split_index.append(len(transcript))
        amount_of_chunks = math.ceil(len(transcript) / piece_length)
        output_file = os.path.join(video_path, row_id + ".vtt")
        print(output_file)
        text_file = open(output_file, "w")
        text_file.write("WEBVTT FILE:\n\n")
        for j in range(len(split_index) - 1):  # this uses a constant piece length
            seconds_start = round((time / amount_of_chunks) * j, 2) + 0.85
            seconds_end = round((time / amount_of_chunks) * (j + 1), 2) + 0.85
            output_start = (
                str(math.floor(seconds_start / 60)).zfill(2)
                + ":"
                + ("%.3f" % (seconds_start % 60)).zfill(6)
            )
            output_end = (
                str(math.floor(seconds_end / 60)).zfill(2)
                + ":"
                + ("%.3f" % (seconds_end % 60)).zfill(6)
            )
            text_file.write("00:" + output_start + " --> " + "00:" + output_end + "\n")
            text_file.write(transcript[split_index[j] : split_index[j + 1]] + "\n\n")
