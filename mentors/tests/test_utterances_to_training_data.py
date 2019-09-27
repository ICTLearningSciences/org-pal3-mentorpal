import logging
import os
import pytest

import pandas as pd

from mentorpath import MentorPath
from process import utterances_to_training_data

COLS_QUESTIONS_PARAPHRASES_ANSWERS = ["Topics", "Helpers", "Mentor", "Question", "text"]

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(
        ".", "tests", "resources", "test_utterances_to_training_data", "mentors"
    )
)


@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_builds_training_data_from_sessions_data(
    mentor_data_root: str, mentor_id: str
):
    _test_it_builds_training_data_from_session_data(mentor_data_root, mentor_id)


# @patch("logging.warning")
# @pytest.mark.parametrize(
#     "mentor_data_root,mentor_id,missing_utterance_types",
#     [
#         (
#             MENTOR_DATA_ROOT,
#             "mentor_has_no_utterances",
#             ["_FEEDBACK_", "_INTRO_", "_OFF_TOPIC_", "_PROMPT_", "_REPEAT_"],
#         ),
#         (
#             MENTOR_DATA_ROOT,
#             "mentor_has_missing_utterance_types_intro_and_feedback",
#             ["_FEEDBACK_", "_INTRO_"],
#         ),
#     ],
# )
# def test_it_builds_training_data_but_logs_a_warning_when_mentor_missing_utterances_types(
#     mockLoggingWarning, mentor_data_root: str, mentor_id: str, missing_utterance_types
# ):
#     _test_it_builds_training_data_from_question_and_answer_transcripts(
#         mentor_data_root, mentor_id
#     )
#     mockLoggingWarning.assert_called_once_with(
#         f"no transcripts found for mentor {mentor_id} with these utterance types: {missing_utterance_types}"
#     )


# @patch("pandas.DataFrame.to_csv")
# @pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor_1")])
# def test_it_writes_output_files_to_expected_paths(
#     mockPandasToCsv, mentor_data_root: str, mentor_id: str
# ):
#     transcripts_to_training_data(mentor_id, data_dir=mentor_data_root)
#     mockPandasToCsv.assert_has_calls(
#         [
#             call(
#                 os.path.join(
#                     mentor_data_root,
#                     f"data/mentors/{mentor_id}/data/questions_paraphrases_answers.csv",
#                 ),
#                 index=False,
#                 mode="w",
#             ),
#             call(
#                 os.path.join(
#                     mentor_data_root,
#                     f"data/mentors/{mentor_id}/data/prompts_utterances.csv",
#                 ),
#                 index=False,
#                 mode="w",
#             ),
#         ]
#     )


def _test_it_builds_training_data_from_session_data(
    mentor_data_root: str, mentor_id: str
):
    mp = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    utterances = mp.load_utterances()
    training_data = utterances_to_training_data(utterances)
    logging.warning(
        f"got training data qpa={training_data.questions_paraphrases_answers}"
    )
    expected_questions_paraphrases_answers = pd.read_csv(
        mp.get_mentor_path("expected_questions_paraphrases_answers.csv")
    ).fillna("")
    pd.testing.assert_frame_equal(
        expected_questions_paraphrases_answers,
        training_data.questions_paraphrases_answers,
    )
    expected_prompts_utterances = pd.read_csv(
        mp.get_mentor_path("expected_prompts_utterances.csv")
    ).fillna("")
    pd.testing.assert_frame_equal(
        expected_prompts_utterances, training_data.prompts_utterances
    )
