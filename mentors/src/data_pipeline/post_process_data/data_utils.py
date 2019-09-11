import ffmpy
from pymediainfo import MediaInfo


def find_video_dims(video_file):
    media_info = MediaInfo.parse(video_file)
    video_tracks = [t for t in media_info.tracks if t.track_type == "Video"]
    return (
        (video_tracks[0].width, video_tracks[0].height)
        if len(video_tracks) >= 1
        else (-1, -1)
    )


def gen_mobile_video(src_file, output_file):
    video_dims = find_video_dims(src_file)
    crop = None
    if video_dims == (1280, 720):
        crop = "614:548:333:86"
    elif video_dims == (1920, 1080):
        crop = "918:822:500:220"
    if crop:
        print(
            f"INFO: generating mobile video {output_file} cropped with {crop} for src file {src_file} with dims {video_dims}"
        )
    else:
        crop = "614:548:333:86"
        print(
            f"WARN: no configured for src file {src_file} with dims {video_dims} using default {crop}"
        )
    ff = ffmpy.FFmpeg(
        inputs={src_file: None}, outputs={output_file: f"-filter:v crop={crop} -y"}
    )
    ff.run()
