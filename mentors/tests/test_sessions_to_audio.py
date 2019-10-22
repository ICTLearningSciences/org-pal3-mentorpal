import os
import pytest
from unittest.mock import patch

from .helpers import (
    assert_session_to_audio_result_summary_match_expected,
    assert_utterances_match_expected,
    copy_mentor_to_tmp,
    MockVideoToAudioConverter,
)
from pipeline.process import sessions_to_audio

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_sessions_to_audio", "mentors")
)


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id",
    [(MENTOR_DATA_ROOT, "generates-audio-for-each-session")],
)
def test_it_generates_audio_for_each_session_video(
    mentor_data_root: str, mentor_id: str
):
    _test_sessions_to_audio(
        mentor_data_root, mentor_id, require_video_to_audio_calls=False
    )


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id",
    [(MENTOR_DATA_ROOT, "generates-audio-for-each-session")],
)
def test_it_logs_info_for_n_of_m_session_audio_generated(
    mentor_data_root: str, mentor_id: str
):
    _test_sessions_to_audio(
        mentor_data_root,
        mentor_id,
        require_video_to_audio_calls=False,
        test_logging=True,
    )


def _test_sessions_to_audio(
    mentor_data_root: str,
    mentor_id: str,
    require_video_to_audio_calls: bool = True,
    require_audio_slice_calls=True,
    test_logging=False,
):
    with patch("pipeline.media_tools.video_to_audio") as mock_video_to_audio, patch(
        "logging.info"
    ) as mock_logging_info:
        mp = copy_mentor_to_tmp(mentor_id, mentor_data_root)
        mock_video_to_audio_converter = MockVideoToAudioConverter(
            mock_video_to_audio,
            create_dummy_output_files=True,
            mock_logging_info=mock_logging_info if test_logging else None,
        )
        utterances_before = mp.load_utterances()
        result = sessions_to_audio(utterances_before, mp)
        mock_video_to_audio_converter.expect_calls(
            mp, fail_on_no_calls=require_video_to_audio_calls
        )
        assert_utterances_match_expected(mp, utterances=result.utterances)
        assert_session_to_audio_result_summary_match_expected(mp, result.summary())
