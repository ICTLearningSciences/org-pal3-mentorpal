import pytest
from unittest.mock import Mock, patch

from post_process_data import gen_mobile_video


class Bunch:
    def __init__(self, **kwds):
        self.__dict__.update(kwds)


@patch("pymediainfo.MediaInfo.parse")
@patch("ffmpy.FFmpeg")
@pytest.mark.parametrize(
    "input_video_dims,expected_crop",
    [((1280, 720), "614:548:333:86"), ((1920, 1080), "918:822:500:220")],
)
def test_it_adjusts_output_crop_size_for_input_video_dims(
    mockFFmpegCls, mockParse, input_video_dims, expected_crop
):
    # TODO: update test to support a wider range of arbitrary input video sizes?
    input = "some_input_video.mp4"
    output = "output_video_path.mp4"
    mockParseResult = Bunch(
        tracks=[
            Bunch(
                track_type="Video",
                width=input_video_dims[0],
                height=input_video_dims[1],
            )
        ]
    )
    mockParse.return_value = mockParseResult
    mockFFmpegInst = Mock()
    mockFFmpegCls.return_value = mockFFmpegInst
    gen_mobile_video(input, output)
    mockFFmpegCls.assert_called_once_with(
        inputs={input: None}, outputs={output: f"-filter:v crop={expected_crop} -y"}
    )
    mockFFmpegInst.run.assert_called_once()
