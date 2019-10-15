import os
import pytest
from unittest.mock import patch

from .helpers import MockTranscriptions
from pipeline.mentorpath import MentorPath
from pipeline.process import update_transcripts
from pipeline import transcriptions
from pipeline.utterances import utterances_from_yaml

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(
        ".", "tests", "resources", "test_utterances_update_transcripts", "mentors"
    )
)


@patch.object(transcriptions, "init_transcription_service")
@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_fills_in_transcripts_on_utterance_data(
    mock_init_transcription_service, mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    input_utterances = mpath.load_utterances()
    mock_transcriptions = MockTranscriptions(mock_init_transcription_service)
    dummy_transcription_service = mock_init_transcription_service()
    expected_utterances = utterances_from_yaml(
        mpath.get_mentor_path("expected-utterances.yaml")
    )
    mock_transcriptions.load_expected_calls(mpath)
    actual_utterances = update_transcripts(
        input_utterances, dummy_transcription_service, mpath
    )
    mock_transcriptions.expect_calls()
    assert expected_utterances.to_dict() == actual_utterances.to_dict()
