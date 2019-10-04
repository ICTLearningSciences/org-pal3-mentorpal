import os
import pytest
from unittest.mock import call, patch

from .helpers import MockVideoToAudio
from pipeline.mentorpath import MentorPath
from pipeline.process import utterances_to_audio
from pipeline.utils import yaml_load

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_utterances_to_audio", "mentors")
)


@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_generates_an_audio_file_for_each_utterance(
    mentor_data_root: str, mentor_id: str
):
    _test_for_expected_slice_audio_calls(
        mentor_data_root, mentor_id, require_video_to_audio_calls=False
    )


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor2-skips-existing-audio")]
)
def test_it_skips_utterances_with_existing_audio_and_unchanged_start_and_end_times(
    mentor_data_root: str, mentor_id: str
):
    _test_for_expected_slice_audio_calls(
        mentor_data_root, mentor_id, require_video_to_audio_calls=False
    )


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id",
    [(MENTOR_DATA_ROOT, "mentor3-extracts-session-audio-from-video")],
)
def test_it_extracts_session_audio_from_video(mentor_data_root: str, mentor_id: str):
    _test_for_expected_slice_audio_calls(
        mentor_data_root, mentor_id, require_video_to_audio_calls=True
    )


def _test_for_expected_slice_audio_calls(
    mentor_data_root: str, mentor_id: str, require_video_to_audio_calls: bool = True
):
    with patch("pipeline.media_tools.slice_audio") as mock_slice_audio, patch(
        "pipeline.media_tools.video_to_audio"
    ) as mock_video_to_audio:
        mock_video_to_audio = MockVideoToAudio(
            mock_video_to_audio, create_dummy_output_files=True
        )
        mp = MentorPath(mentor_id, mentor_data_root)
        mock_video_to_audio.load_expected_calls(
            mp, fail_on_no_calls=require_video_to_audio_calls
        )
        utterances = mp.load_utterances()
        audioslice_target_root = os.path.join(mp.get_build_path("utterance_audio"))
        expected_calls_data = yaml_load(
            mp.get_mentor_path("expected-slice-audio-calls.yaml")
        )
        expected_calls = []
        for call_data in expected_calls_data:
            expected_calls.append(
                call(
                    mp.get_mentor_path(call_data.get("source")),
                    os.path.join(audioslice_target_root, call_data.get("target")),
                    call_data.get("time_start_secs"),
                    call_data.get("time_end_secs"),
                )
            )
        utterances_to_audio(utterances, mp, audioslice_target_root)
        mock_slice_audio.assert_has_calls(expected_calls)
