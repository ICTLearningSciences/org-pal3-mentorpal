import pytest
from unittest.mock import patch

from .helpers import MockTranscriptions, resource_root_mentors_for_test
from pipeline.mentorpath import MentorPath
from pipeline.process import update_transcripts
from pipeline import transcriptions
from pipeline.utterances import utterances_from_yaml


MENTOR_DATA_ROOT = resource_root_mentors_for_test(__file__)


@patch.object(transcriptions, "init_transcription_service")
@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_fills_in_transcripts_on_utterance_data(
    mock_init_transcription_service, mentor_data_root: str, mentor_id: str
):
    _test_utterances_update_transcripts(
        mock_init_transcription_service, mentor_data_root, mentor_id
    )


@patch.object(transcriptions, "init_transcription_service")
@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_logs_info_for_each_transcription_call(
    mock_init_transcription_service, mentor_data_root: str, mentor_id: str
):
    _test_utterances_update_transcripts(
        mock_init_transcription_service, mentor_data_root, mentor_id, test_logging=True
    )


def _test_utterances_update_transcripts(
    mock_init_transcription_service,
    mentor_data_root: str,
    mentor_id: str,
    test_logging=False,
):
    with patch("logging.info") as mock_logging_info:
        mpath = MentorPath(mentor_id=mentor_id, root_path_data_mentors=mentor_data_root)
        input_utterances = mpath.load_utterances()
        mock_transcriptions = MockTranscriptions(
            mock_init_transcription_service,
            mock_logging_info=mock_logging_info if test_logging else None,
        )
        dummy_transcription_service = mock_init_transcription_service()
        expected_utterances = utterances_from_yaml(
            mpath.get_mentor_data("expected-utterances.yaml")
        )
        mock_transcriptions.load_expected_calls(mpath)
        actual_utterances = update_transcripts(
            input_utterances, dummy_transcription_service, mpath
        )
        mock_transcriptions.expect_calls()
        assert expected_utterances.to_dict() == actual_utterances.to_dict()
