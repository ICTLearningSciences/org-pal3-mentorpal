import os
import pytest
from unittest.mock import call, patch

from mentorpath import MentorPath
from process import utterances_to_audioslices
from utils import yaml_load

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_utterances_to_audioslices", "mentors")
)


@patch("audioslicer.slice_audio")
@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_generates_an_audio_file_for_each_utterance(
    mock_slice_audio, mentor_data_root: str, mentor_id: str
):
    mp = MentorPath(mentor_id, mentor_data_root)
    utterances = mp.load_utterances()
    audioslice_target_root = os.path.join(mp.get_build_path("audioslices"))
    expected_audioslices = yaml_load(mp.get_mentor_path("expected-audioslices.yaml"))
    expected_slice_calls = []
    for expected_slice_data in expected_audioslices:
        expected_slice_calls.append(
            call(
                mp.get_mentor_path(expected_slice_data.get("source")),
                os.path.join(audioslice_target_root, expected_slice_data.get("target")),
                expected_slice_data.get("time_start_secs"),
                expected_slice_data.get("time_end_secs"),
            )
        )
    utterances_to_audioslices(utterances, mp.get_mentor_path(), audioslice_target_root)
    mock_slice_audio.assert_has_calls(expected_slice_calls)
