import os
from unittest.mock import patch

import pytest

from pipeline.mentorpath import MentorPath
from pipeline.media_tools import slice_audio


MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_slice_audio", "mentors")
)


@patch("os.makedirs")
@patch("ffmpy.FFmpeg")
@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_creates_directories_for_output_as_needed(
    mock_ffmpeg, mock_make_dirs, mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    audio_src = mpath.get_mentor_path(
        os.path.join("build", "recordings", "session1", "p1-some-questions.mp3")
    )
    audio_tgt = os.path.join("build", "utterance_audio", "utterance1.mp3")
    slice_audio(audio_src, audio_tgt, 0.0, 1.0)
    mock_make_dirs.assert_called_once_with(os.path.dirname(audio_tgt), exist_ok=True)
