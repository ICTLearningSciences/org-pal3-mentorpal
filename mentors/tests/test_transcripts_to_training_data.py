import io
import os
import pytest
from unittest.mock import Mock, patch

import pandas as pd

from transcript_adapter import transcripts_to_training_data
from .helpers import Bunch

QPA_ORDER = ["Topics", "Helpers", "Mentor", "Question", "text"]

MENTOR_DATA_ROOT = os.path.join(
    ".", "tests", "resources", "test_transcripts_to_training_data", "mentors"
)


@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor_1")])
def test_it_builds_training_data_from_question_and_answer_transcripts(
    mentor_data_root, mentor_id
):
    qpa_out = io.StringIO()
    pu_out = io.StringIO()
    transcripts_to_training_data(
        mentor_id,
        data_dir=mentor_data_root,
        questions_paraphrases_answers_output=qpa_out,
        prompts_utterances_output=pu_out,
    )
    qpa_out.seek(0)
    pu_out.seek(0)
    actual_qpa = pd.read_csv(qpa_out)
    print(actual_qpa)
    expected_qpa = pd.read_csv(
        os.path.join(
            mentor_data_root, mentor_id, "expected_questions_paraphrases_answers.csv"
        )
    )
    pd.testing.assert_frame_equal(expected_qpa, actual_qpa)
