import io
import glob
import os
import pytest
from unittest.mock import call, patch

import pandas as pd

from preprocess_data import sessions_to_transcripts
from utils import yaml_load

# QPA_ORDER = ["Topics", "Helpers", "Mentor", "Question", "text"]

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_sessions_to_transcripts", "mentors")
)


@patch("utils.yaml_write")
@pytest.mark.parametrize(
    "mentor_data_root,mentor_id,expected_transcription_count",
    [(MENTOR_DATA_ROOT, "mentor-1", 6)],
)
def test_it_outputs_one_transcript_file_per_row_in_timestamps(
    mock_yaml_write,
    mentor_data_root: str,
    mentor_id: str,
    expected_transcription_count: int,
):
    mentor_root = os.path.join(mentor_data_root, mentor_id)
    build_root = os.path.join(mentor_root, "build")
    session_root = os.path.join(build_root, "recordings")
    expected_transcriptions_root = os.path.join(mentor_root, "expected-transcriptions")
    mock_transcriptions_root = os.path.join(mentor_root, "mock-transcription-service")
    sessions_to_transcripts(session_root)
    expected_transcription_glob_path = os.path.join(
        expected_transcriptions_root, "*.yaml"
    )
    expected_transcripts_list = glob.glob(expected_transcription_glob_path)
    assert (
        len(expected_transcripts_list) == expected_transcription_count
    ), f"test data should include the expected number of transcriptions ({expected_transcription_count}) matching {expected_transcription_glob_path}"
    expected_write_transcript_calls = []
    for expected_transcript_file in expected_transcripts_list:
        expected_transcript_yaml = yaml_load(expected_transcript_file)
        expected_transcript_filename = os.path.basename(expected_transcript_file)
        expected_transcript_yaml_path = os.path.join(
            build_root, "transcripts", expected_transcript_filename
        )
        expected_write_transcript_calls.append(
            call(
                mock_yaml_write(expected_transcript_yaml, expected_transcript_yaml_path)
            )
        )
    assert (
        len(expected_write_transcript_calls) == expected_transcription_count
    ), f"test data should include the expected number of transcriptions ({expected_transcription_count}) matching {expected_transcription_glob_path}"


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


# def _test_it_builds_training_data_from_question_and_answer_transcripts(
#     mentor_data_root: str, mentor_id: str
# ):
#     questions_paraphrases_answers_out = io.StringIO()
#     prompts_utterances_out = io.StringIO()
#     transcripts_to_training_data(
#         mentor_id,
#         data_dir=mentor_data_root,
#         questions_paraphrases_answers_output=questions_paraphrases_answers_out,
#         prompts_utterances_output=prompts_utterances_out,
#     )
#     expected_questions_paraphrases_answers = pd.read_csv(
#         os.path.join(
#             mentor_data_root, mentor_id, "expected_questions_paraphrases_answers.csv"
#         )
#     )
#     questions_paraphrases_answers_out.seek(0)
#     actual_questions_paraphrases_answers = pd.read_csv(
#         questions_paraphrases_answers_out
#     )
#     pd.testing.assert_frame_equal(
#         expected_questions_paraphrases_answers, actual_questions_paraphrases_answers
#     )
#     expected_prompts_utterances = pd.read_csv(
#         os.path.join(mentor_data_root, mentor_id, "expected_prompts_utterances.csv")
#     )
#     prompts_utterances_out.seek(0)
#     actual_prompts_utterances = pd.read_csv(prompts_utterances_out)
#     pd.testing.assert_frame_equal(
#         expected_prompts_utterances, actual_prompts_utterances
#     )
