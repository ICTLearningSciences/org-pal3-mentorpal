import logging
from tempfile import mkdtemp
import os

import pandas as pd
import pytest
from distutils.dir_util import copy_tree
from unittest.mock import call, patch

from pipeline.mentorpath import MentorPath
from pipeline.run import Pipeline
from pipeline.process import update_transcripts
from pipeline.training_data import load_questions_paraphrases_answers
from pipeline.transcriptions import TranscriptionService
from pipeline.utterances import utterances_from_yaml
from pipeline.utils import yaml_load

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_run_data_update", "mentors")
)


@patch.object(TranscriptionService, "transcribe")
@pytest.mark.parametrize(
    "mentor_data_root,mentor_id",
    [(MENTOR_DATA_ROOT, "mentor-generates-all-data-files")],
)
def test_it_generates_all_data_files_for_a_mentor(
    mock_transcribe, mentor_data_root: str, mentor_id: str
):
    tmp_mentors = mkdtemp()
    mpath = MentorPath(mentor_id=mentor_id, root_path=tmp_mentors)
    src = os.path.join(mentor_data_root, mentor_id)
    tgt = mpath.get_mentor_path()
    logging.warning(f"tgt={tgt}")
    copy_tree(src, tgt)
    p = Pipeline(mentor_id, mpath.root_path)
    p.data_update()
    expected_qpa = load_questions_paraphrases_answers(
        mpath.get_mentor_path(
            os.path.join("expected_data", "questions_paraphrases_answers.csv")
        )
    )
    actual_qpa = mpath.load_questions_paraphrases_answers()
    logging.warning(f"check results in {mpath.get_mentor_path()}")
    logging.warning(f"actualqpa={actual_qpa}")
    logging.warning(f"expected_qpa={expected_qpa}")
    pd.testing.assert_frame_equal(expected_qpa, actual_qpa)

    # mpath = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    # input_utterances = mpath.load_utterances()
    # dummy_transcription_service = TranscriptionService()
    # expected_utterances = utterances_from_yaml(
    #     mpath.get_mentor_path("expected-utterances.yaml")
    # )
    # mock_transcribe_calls = yaml_load(
    #     mpath.get_mentor_path("mock-transcribe-calls.yaml")
    # )
    # expected_transcribe_calls = []
    # expected_transcribe_returns = []
    # for call_data in mock_transcribe_calls:
    #     expected_transcribe_calls.append(
    #         call(mpath.get_mentor_path(call_data.get("audio")))
    #     )
    #     expected_transcribe_returns.append(call_data.get("transcript"))
    # mock_transcribe.side_effect = expected_transcribe_returns
    # actual_utterances = update_transcripts(
    #     input_utterances, dummy_transcription_service, mpath
    # )
    # mock_transcribe.assert_has_calls(expected_transcribe_calls)
    # assert expected_utterances.to_dict() == actual_utterances.to_dict()
