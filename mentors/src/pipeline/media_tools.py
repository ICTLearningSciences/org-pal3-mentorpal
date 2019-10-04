import os
import re

import ffmpy


def slice_audio(  # noqa: E302
    src_file: str, target_file: str, time_start: float, time_end: float
) -> None:
    output_command = "-ss {} -to {} -c:a libvorbis -q:a 5 -loglevel quiet".format(
        time_start, time_end
    )
    ff = ffmpy.FFmpeg(inputs={src_file: None}, outputs={target_file: output_command})
    ff.run()


def video_to_audio(input_file, output_file=None):
    """
    Converts the .mp4 file to a .ogg file.
    Later, this .wav file is split into smaller chunks for each Q-A pair.
    This is done because we want transcriptions for each question and the interview contains
    lots of other content like general talking and discussions.
    We use the timestamps for each Q-A to split the .ogg file.
    This function is equivalent to running `ffmpeg -i input_file output_file -loglevel quiet` on the command line.

    Parameters:
    input_file: Examples are /example/path/to/session1/session1part1.mp4, /example/path/to/session1/session1part2.mp4
    output_file: if not set, uses {input_file}.wav

    Returns:
    error_code: if conversion fails, return 1
    """
    error_code = 0
    if os.path.exists(input_file):
        output_file = output_file or re.sub(r".mp4$", ".wav", input_file)
        output_command = "-loglevel quiet -y"
        ff = ffmpy.FFmpeg(
            inputs={input_file: None}, outputs={output_file: output_command}
        )
        ff.run()
    else:
        print("ERROR: Can't covert audio, {} doesn't exist".format(input_file))
        error_code = 1
    return error_code
