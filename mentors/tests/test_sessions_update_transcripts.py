import os
import pytest
from unittest.mock import call, patch

from mentorpath import MentorPath
from sessions import sessions_from_yaml, update_transcripts
import transcriptions
from utils import yaml_load

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(
        ".", "tests", "resources", "test_sessions_update_transcripts", "mentors"
    )
)


@patch.object(transcriptions.TranscriptionService, "transcribe")
@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_fills_in_transcripts_on_result_sessions_data(
    mock_transcribe, mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    mentor_root = mpath.get_mentor_root()
    sessions_data_path = os.path.join(
        mentor_data_root, mentor_id, ".mentor", "sessions.yaml"
    )
    input_sessions = sessions_from_yaml(sessions_data_path)
    dummy_transcription_service = transcriptions.TranscriptionService()
    # audioslice_target_root = os.path.join(mentor_root, "audioslices")
    expected_sessions_result = sessions_from_yaml(
        os.path.join(mentor_root, "expected-sessions.yaml")
    )
    mock_transcribe_calls = yaml_load(
        os.path.join(mentor_root, "mock-transcribe-calls.yaml")
    )
    expected_transcribe_calls = []
    expected_transcribe_returns = []
    for call_data in mock_transcribe_calls:
        expected_transcribe_calls.append(
            call(os.path.join(mentor_root, call_data.get("audio")))
        )
        expected_transcribe_returns.append(call_data.get("transcript"))
    mock_transcribe.side_effect = expected_transcribe_returns
    actual_result_sessions = update_transcripts(
        input_sessions, dummy_transcription_service, mpath.get_audio_slices_root()
    )
    mock_transcribe.assert_has_calls(expected_transcribe_calls)
    assert expected_sessions_result.to_dict() == actual_result_sessions.to_dict()
