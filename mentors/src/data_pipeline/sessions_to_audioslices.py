import glob
import logging
import os
import re

import audioslicer
import utils


def sessions_to_audioslices(sessions_root: str, output_root: str) -> None:
    """
    Give a root sessions directory, looks for paired audio and timestamp files
    and slices up the source audio in to one wav file per row in each timestamp csv.

    For illustration, the source sessions_root might contain the following:

        <root>/session1/part1_audio.wav
        <root>/session1/part1_timestamps.csv
        <root>/session1/part2_audio.wav
        <root>/session1/part2_timestamps.csv
        <root>/session2/part1_audio.wav
        <root>/session2/part1_timestamps.csv

    ...and depending on the contents of timestamps.csv file that might produce

        <output_root>/s001p001-00000413-00000805.wav 
        <output_root>/s001p001-00001224-00001501.wav
        <output_root>/s001p002-00002701-00005907.wav
        <output_root>/s001p002-00011804-00013229.wav
        <output_root>/s002p001-00004213-00005410.wav
        <output_root>/s002p001-00010515-00012605.wav

    Where the final two numbers in each sliced wav file above are the time_start and time end, 
    e.g. 00000413 = 00:00:04:13
    """
    audio_files = sorted(
        glob.glob(os.path.join(os.path.abspath(sessions_root), "**/*.wav"))
    )
    abs_output_root = os.path.abspath(output_root)
    parts_by_session_dir = {}
    for audio_filepath in audio_files:
        audio_filename = os.path.basename(audio_filepath)
        session_dir = os.path.dirname(audio_filepath)
        if session_dir not in parts_by_session_dir:
            parts_by_session_dir[session_dir] = []
        parts = parts_by_session_dir[session_dir]
        parts.append(audio_filename)
        # because session/part paths are sorted, we can just count for session num  and part num
        session_num = len(parts_by_session_dir)
        part_num = len(parts)
        timestamps_filename = audio_filename.replace("_audio.wav", "_timestamps.csv")
        timestamps_file = os.path.join(session_dir, timestamps_filename)
        if not os.path.isfile(timestamps_file):
            logging.warning(
                f"missing expected timestamp file for paired audio at {timestamps_file}"
            )
            continue
        try:
            text_type, questions, start_times, end_times = utils.load_timestamp_data(
                timestamps_file, convert_timestamps_to_seconds=False
            )
            for start, end in zip(start_times, end_times):
                slice_file = os.path.join(
                    abs_output_root,
                    f"s{session_num:03}p{part_num:03}-{_polish_timestamp(start)}-{_polish_timestamp(end)}.wav",
                )
                audioslicer.slice_audio(
                    audio_filepath,
                    slice_file,
                    utils.convert_to_seconds(start),
                    utils.convert_to_seconds(end),
                )
        except BaseException as ts_file_err:
            logging.warning(
                f"error parsing timestamps from {timestamps_file}: {str(ts_file_err)}"
            )


def _polish_timestamp(ts: str) -> str:
    parts = ts.split(":")
    return "".join(parts)
