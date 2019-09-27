import os
import pytest
from unittest.mock import call, patch

from mentorpath import MentorPath
from process import update_transcripts
import transcriptions
from utterances import utterances_from_yaml
from utils import yaml_load

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(
        ".", "tests", "resources", "test_utterances_update_transcripts", "mentors"
    )
)


@patch.object(transcriptions.TranscriptionService, "transcribe")
@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_fills_in_transcripts_on_utterance_data(
    mock_transcribe, mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    # mentor_root = mpath.get_mentor_path()
    # sessions_data_path = os.path.join(
    #     mentor_data_root, mentor_id, ".mentor", "sessions.yaml"
    # )
    # input_sessions = sessions_from_yaml(sessions_data_path)
    input_utterances = mpath.load_utterances()
    dummy_transcription_service = transcriptions.TranscriptionService()
    expected_utterances = utterances_from_yaml(
        mpath.get_mentor_path("expected-utterances.yaml")
    )
    mock_transcribe_calls = yaml_load(
        mpath.get_mentor_path("mock-transcribe-calls.yaml")
    )
    expected_transcribe_calls = []
    expected_transcribe_returns = []
    for call_data in mock_transcribe_calls:
        expected_transcribe_calls.append(
            call(mpath.get_mentor_path(call_data.get("audio")))
        )
        expected_transcribe_returns.append(call_data.get("transcript"))
    mock_transcribe.side_effect = expected_transcribe_returns
    actual_utterances = update_transcripts(
        input_utterances, dummy_transcription_service, mpath
    )
    mock_transcribe.assert_has_calls(expected_transcribe_calls)
    assert expected_utterances.to_dict() == actual_utterances.to_dict()
