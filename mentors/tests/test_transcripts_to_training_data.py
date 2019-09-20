import io
import os
import pytest
from unittest.mock import patch

import pandas as pd

from transcript_adapter import transcripts_to_training_data

QPA_ORDER = ["Topics", "Helpers", "Mentor", "Question", "text"]

MENTOR_DATA_ROOT = os.path.join(
    ".", "tests", "resources", "test_transcripts_to_training_data", "mentors"
)


@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor_1")])
def test_it_builds_training_data_from_question_and_answer_transcripts(
    mentor_data_root: str, mentor_id: str
):
    _test_it_builds_training_data_from_question_and_answer_transcripts(
        mentor_data_root, mentor_id
    )


@patch("logging.warning")
@pytest.mark.parametrize(
    "mentor_data_root,mentor_id,missing_utterance_types",
    [
        (
            MENTOR_DATA_ROOT,
            "mentor_has_no_utterances",
            ["_FEEDBACK_", "_INTRO_", "_OFF_TOPIC_", "_PROMPT_", "_REPEAT_"],
        ),
        (
            MENTOR_DATA_ROOT,
            "mentor_has_missing_utterance_types_intro_and_feedback",
            ["_FEEDBACK_", "_INTRO_"],
        ),
    ],
)
def test_it_builds_training_data_but_logs_a_warning_when_mentor_missing_utterances_types(
    mockLoggingWarning, mentor_data_root: str, mentor_id: str, missing_utterance_types
):
    _test_it_builds_training_data_from_question_and_answer_transcripts(
        mentor_data_root, mentor_id
    )
    mockLoggingWarning.assert_called_once_with(
        f"no transcripts found for mentor {mentor_id} with these utterance types: {missing_utterance_types}"
    )


def _test_it_builds_training_data_from_question_and_answer_transcripts(
    mentor_data_root: str, mentor_id: str
):
    questions_paraphrases_answers_out = io.StringIO()
    prompts_utterances_out = io.StringIO()
    transcripts_to_training_data(
        mentor_id,
        data_dir=mentor_data_root,
        questions_paraphrases_answers_output=questions_paraphrases_answers_out,
        prompts_utterances_output=prompts_utterances_out,
    )
    expected_questions_paraphrases_answers = pd.read_csv(
        os.path.join(
            mentor_data_root, mentor_id, "expected_questions_paraphrases_answers.csv"
        )
    )
    questions_paraphrases_answers_out.seek(0)
    actual_questions_paraphrases_answers = pd.read_csv(
        questions_paraphrases_answers_out
    )
    pd.testing.assert_frame_equal(
        expected_questions_paraphrases_answers, actual_questions_paraphrases_answers
    )
    expected_prompts_utterances = pd.read_csv(
        os.path.join(mentor_data_root, mentor_id, "expected_prompts_utterances.csv")
    )
    prompts_utterances_out.seek(0)
    actual_prompts_utterances = pd.read_csv(prompts_utterances_out)
    pd.testing.assert_frame_equal(
        expected_prompts_utterances, actual_prompts_utterances
    )
