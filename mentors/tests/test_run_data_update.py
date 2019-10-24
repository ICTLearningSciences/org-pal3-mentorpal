import os

import pandas as pd
import pytest
from unittest.mock import patch

from .helpers import (
    copy_mentor_to_tmp,
    MockAudioSlicer,
    MockTranscriptions,
    MockVideoToAudioConverter,
    assert_utterances_match_expected,
)
from pipeline.run import Pipeline
from pipeline.training_data import (
    load_classifier_data,
    load_questions_paraphrases_answers,
    load_prompts_utterances,
    load_utterance_data,
)


MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_run_data_update", "mentors")
)


@patch("pipeline.media_tools.video_to_audio")
@patch("pipeline.media_tools.slice_audio")
@patch("pipeline.transcriptions.init_transcription_service")
@pytest.mark.parametrize(
    "mentor_data_root,mentor_id",
    [(MENTOR_DATA_ROOT, "mentor-generates-all-data-files")],
)
def test_it_generates_all_data_files_for_a_mentor(
    mock_init_transcription_service,
    mock_slice_audio,
    mock_video_to_audio,
    mentor_data_root: str,
    mentor_id: str,
):
    mpath = copy_mentor_to_tmp(mentor_id, mentor_data_root)
    mock_transcriptions = MockTranscriptions(mock_init_transcription_service)
    mock_transcriptions.load_expected_calls(mpath)
    MockAudioSlicer(mock_slice_audio, create_dummy_output_files=True)
    MockVideoToAudioConverter(mock_video_to_audio, create_dummy_output_files=True)
    p = Pipeline(mentor_id, mpath.root_path)
    p.data_update()
    assert_utterances_match_expected(mpath)
    expected_questions_paraphrases_answers = load_questions_paraphrases_answers(
        mpath.get_mentor_path(os.path.join("expected_data"))
    )
    actual_questions_paraphrases_answers = (
        mpath.load_training_questions_paraphrases_answers()
    )
    pd.testing.assert_frame_equal(
        expected_questions_paraphrases_answers, actual_questions_paraphrases_answers
    )
    expected_prompts_utterances = load_prompts_utterances(
        mpath.get_mentor_path(os.path.join("expected_data"))
    )
    actual_prompts_utterances = mpath.load_training_prompts_utterances()
    pd.testing.assert_frame_equal(
        expected_prompts_utterances, actual_prompts_utterances
    )
    expected_utterance_data = load_utterance_data(
        mpath.get_mentor_path(os.path.join("expected_data"))
    )
    actual_utterance_data = mpath.load_training_utterance_data()
    pd.testing.assert_frame_equal(expected_utterance_data, actual_utterance_data)
    expected_classifier_data = load_classifier_data(
        mpath.get_mentor_path(os.path.join("expected_data"))
    )
    actual_classifier_data = mpath.load_training_classifier_data()
    pd.testing.assert_frame_equal(expected_classifier_data, actual_classifier_data)
