import os
import pytest
from unittest.mock import patch

from .helpers import (
    assert_utterances_match_expected,
    copy_mentor_to_tmp,
    MockAudioSlicer,
    MockVideoToAudioConverter,
)
from pipeline.process import utterances_to_audio

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_utterances_to_audio", "mentors")
)


@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_generates_an_audio_file_for_each_utterance(
    mentor_data_root: str, mentor_id: str
):
    _test_utterance_to_audio(
        mentor_data_root, mentor_id, require_video_to_audio_calls=False
    )


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor2-skips-existing-audio")]
)
def test_it_skips_utterances_with_existing_audio_and_unchanged_start_and_end_times(
    mentor_data_root: str, mentor_id: str
):
    _test_utterance_to_audio(
        mentor_data_root, mentor_id, require_video_to_audio_calls=False
    )


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id",
    [(MENTOR_DATA_ROOT, "mentor3-extracts-session-audio-from-video")],
)
def test_it_extracts_session_audio_from_video(mentor_data_root: str, mentor_id: str):
    _test_utterance_to_audio(
        mentor_data_root, mentor_id, require_video_to_audio_calls=True
    )


def _test_utterance_to_audio(
    mentor_data_root: str,
    mentor_id: str,
    require_video_to_audio_calls: bool = True,
    require_audio_slice_calls=True,
):
    with patch("pipeline.media_tools.slice_audio") as mock_slice_audio, patch(
        "pipeline.media_tools.video_to_audio"
    ) as mock_video_to_audio:
        mp = copy_mentor_to_tmp(mentor_id, mentor_data_root)
        mock_video_to_audio_converter = MockVideoToAudioConverter(
            mock_video_to_audio, create_dummy_output_files=True
        )
        mock_video_to_audio_converter.load_expected_calls(
            mp, fail_on_no_calls=require_video_to_audio_calls
        )
        mock_audio_slicer = MockAudioSlicer(mock_slice_audio)
        utterances_before = mp.load_utterances()
        actual_utterances = utterances_to_audio(utterances_before, mp)
        mock_video_to_audio_converter.expect_calls()
        mock_audio_slicer.assert_has_calls(
            mp, fail_on_no_calls=require_audio_slice_calls
        )
        assert_utterances_match_expected(mp, utterances=actual_utterances)
