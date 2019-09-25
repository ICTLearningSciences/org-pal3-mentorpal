import os
import pytest
from unittest.mock import call, patch

from sessions import sessions_from_yaml, sessions_to_audioslices
import utils

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_sessions_to_audioslices", "mentors")
)


@patch("audioslicer.slice_audio")
@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_outputs_one_audioslice_item_in_sessions_data(
    mock_slice_audio, mentor_data_root: str, mentor_id: str
):
    mentor_root = os.path.join(mentor_data_root, mentor_id)
    sessions_data_path = os.path.join(
        mentor_data_root, mentor_id, ".mentor", "sessions.yaml"
    )
    sessions = sessions_from_yaml(sessions_data_path)
    audioslice_target_root = os.path.join(mentor_root, "audioslices")
    expected_audioslices = utils.yaml_load(
        os.path.join(mentor_root, "expected-audioslices.yaml")
    )
    expected_slice_calls = []
    for expected_slice_data in expected_audioslices:
        expected_slice_calls.append(
            call(
                os.path.join(mentor_root, expected_slice_data.get("source")),
                os.path.join(audioslice_target_root, expected_slice_data.get("target")),
                expected_slice_data.get("time_start_secs"),
                expected_slice_data.get("time_end_secs"),
            )
        )
    sessions_to_audioslices(sessions, mentor_root, audioslice_target_root)
    mock_slice_audio.assert_has_calls(expected_slice_calls)
