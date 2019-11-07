import pytest
from unittest.mock import Mock, patch

from callee.operators import Contains

from pipeline.media_tools import video_encode_for_mobile

from .helpers import Bunch


@patch("os.makedirs")
@patch("pymediainfo.MediaInfo.parse")
@patch("ffmpy.FFmpeg")
@pytest.mark.parametrize(
    "input_video_dims,expected_crop",
    [((1280, 720), "614:548:333:86"), ((1920, 1080), "918:822:500:220")],
)
def test_it_adjusts_output_crop_size_for_input_video_dims(
    mock_ffmpeg_cls,
    mock_media_info_parse,
    mock_makedirs,
    input_video_dims,
    expected_crop,
):
    # TODO: update test to support a wider range of arbitrary input video sizes?
    input = "some_input_video.mp4"
    output = "output_video_path.mp4"
    mock_media_info_parseResult = Bunch(
        tracks=[
            Bunch(
                track_type="Video",
                width=input_video_dims[0],
                height=input_video_dims[1],
            )
        ]
    )
    mock_media_info_parse.return_value = mock_media_info_parseResult
    mockFFmpegInst = Mock()
    mock_ffmpeg_cls.return_value = mockFFmpegInst
    video_encode_for_mobile(input, output)
    mock_ffmpeg_cls.assert_called_once_with(
        inputs={input: None}, outputs={output: Contains(f"crop={expected_crop}")}
    )
    mockFFmpegInst.run.assert_called_once()
