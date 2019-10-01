import ffmpy


def slice_audio(  # noqa: E302
    src_file: str, target_file: str, time_start: float, time_end: float
) -> None:
    output_command = "-ss {} -to {} -c:a libvorbis -q:a 5 -loglevel quiet".format(
        time_start, time_end
    )
    ff = ffmpy.FFmpeg(inputs={src_file: None}, outputs={target_file: output_command})
    ff.run()
