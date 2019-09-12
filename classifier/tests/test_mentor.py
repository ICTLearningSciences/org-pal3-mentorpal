from os import path
from unittest.mock import patch

import pytest

from mentorpal.mentor import Mentor


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id,expected_data",
    [
        (
            path.join(".", "tests", "resources", "mentors", "{}", "data"),
            "mentor_01",
            {
                "id": "mentor_01",
                "name": "Mentor Number 1",
                "short_name": "M1",
                "title": "First Example Mentor",
                "questions_by_id": {
                    "mentor_01_a1_1_1": {
                        "question_text": "Who are you and what do you do?"
                    },
                    "mentor_01_a25_1_1": {
                        "question_text": "How do you spend most of your time off deployment?"
                    },
                    "mentor_01_a32_1_1": {
                        "question_text": "What is the Navy doing to combat heavy alcohol use?"
                    },
                },
                "topics_by_id": {
                    "about_me": {"name": "About Me", "questions": ["mentor_01_a1_1_1"]},
                    "about_the_job": {
                        "name": "About the Job",
                        "questions": ["mentor_01_a25_1_1"],
                    },
                    "lifestyle": {
                        "name": "LifeStyle",
                        "questions": ["mentor_01_a25_1_1", "mentor_01_a32_1_1"],
                    },
                },
                "utterances_by_type": {
                    "_INTRO_": [
                        (
                            "mentor_01_u1_1_1",
                            "Hi, my name is Mentor 01 and this is my configured intro",
                        )
                    ],
                    "_REPEAT_": [("mentor_01_u2_1_1", "I may have said this before")],
                    "_FEEDBACK_": [("mentor_01_u3_1_1", "No")],
                    "_PROMPT_": [("mentor_01_u4_1_1", "Anything else?")],
                    "_OFF_TOPIC_": [
                        (
                            "mentor_01_u5_1_1",
                            "That is a great question. I wish I'd thought of that.",
                        )
                    ],
                    "_IDLE_": [("idle", "")],
                },
            },
        )
    ],
)
def test_it_loads_from_mentor_data(mentor_data_root, mentor_id, expected_data):
    m = Mentor(mentor_id, mentor_data_root=mentor_data_root)
    assert m.to_dict() == expected_data


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id,expected_data",
    [
        (
            path.join(".", "tests", "resources", "mentors", "{}", "data"),
            "mentor_with_mixed_case_ids",
            {
                "id": "mentor_with_mixed_case_ids",
                "name": "Mentor Number 1",
                "short_name": "M1",
                "title": "First Example Mentor",
                "questions_by_id": {
                    "ID_Has_miXed_cAse": {
                        "question_text": "Who are you and what do you do?"
                    }
                },
                "topics_by_id": {
                    "about_me": {"name": "About Me", "questions": ["ID_Has_miXed_cAse"]}
                },
                "utterances_by_type": {
                    "_INTRO_": [
                        (
                            "mentor_01_u1_1_1",
                            "Hi, my name is Mentor 01 and this is my configured intro",
                        )
                    ],
                    "_REPEAT_": [("mentor_01_u2_1_1", "I may have said this before")],
                    "_FEEDBACK_": [("mentor_01_u3_1_1", "No")],
                    "_PROMPT_": [("mentor_01_u4_1_1", "Anything else?")],
                    "_OFF_TOPIC_": [
                        (
                            "mentor_01_u5_1_1",
                            "That is a great question. I wish I'd thought of that.",
                        )
                    ],
                    "_IDLE_": [("idle", "")],
                },
            },
        )
    ],
)
def test_it_preserves_mixed_case_ids_for_now(
    mentor_data_root, mentor_id, expected_data
):
    m = Mentor(mentor_id, mentor_data_root=mentor_data_root)
    assert m.to_dict() == expected_data


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id,expected_data",
    [
        (
            path.join(".", "tests", "resources", "mentors", "{}", "data"),
            "mentor_is_missing_profile_yaml",
            {
                "id": "mentor_is_missing_profile_yaml",
                "name": "mentor_is_missing_profile_yaml",
                "short_name": "mentor_is_missing_profile_yaml",
                "title": "mentor",
                "questions_by_id": {
                    "mentor_01_a1_1_1": {
                        "question_text": "Who are you and what do you do?"
                    }
                },
                "topics_by_id": {
                    "about_me": {"name": "About Me", "questions": ["mentor_01_a1_1_1"]}
                },
                "utterances_by_type": {
                    "_INTRO_": [
                        (
                            "mentor_01_u1_1_1",
                            "Hi, my name is Mentor 01 and this is my configured intro",
                        )
                    ],
                    "_REPEAT_": [("mentor_01_u2_1_1", "I may have said this before")],
                    "_FEEDBACK_": [("mentor_01_u3_1_1", "No")],
                    "_PROMPT_": [("mentor_01_u4_1_1", "Anything else?")],
                    "_OFF_TOPIC_": [
                        (
                            "mentor_01_u5_1_1",
                            "That is a great question. I wish I'd thought of that.",
                        )
                    ],
                    "_IDLE_": [("idle", "")],
                },
            },
        ),
        (
            path.join(".", "tests", "resources", "mentors", "{}", "data"),
            "mentor_has_invalid_profile_yaml",
            {
                "id": "mentor_has_invalid_profile_yaml",
                "name": "mentor_has_invalid_profile_yaml",
                "short_name": "mentor_has_invalid_profile_yaml",
                "title": "mentor",
                "questions_by_id": {
                    "mentor_01_a1_1_1": {
                        "question_text": "Who are you and what do you do?"
                    }
                },
                "topics_by_id": {
                    "about_me": {"name": "About Me", "questions": ["mentor_01_a1_1_1"]}
                },
                "utterances_by_type": {
                    "_INTRO_": [
                        (
                            "mentor_01_u1_1_1",
                            "Hi, my name is Mentor 01 and this is my configured intro",
                        )
                    ],
                    "_REPEAT_": [("mentor_01_u2_1_1", "I may have said this before")],
                    "_FEEDBACK_": [("mentor_01_u3_1_1", "No")],
                    "_PROMPT_": [("mentor_01_u4_1_1", "Anything else?")],
                    "_OFF_TOPIC_": [
                        (
                            "mentor_01_u5_1_1",
                            "That is a great question. I wish I'd thought of that.",
                        )
                    ],
                    "_IDLE_": [("idle", "")],
                },
            },
        ),
    ],
)
def test_it_uses_defaults_if_profile_yaml_is_missing_or_invalid(
    mentor_data_root, mentor_id, expected_data
):
    m = Mentor(mentor_id, mentor_data_root=mentor_data_root)
    assert m.to_dict() == expected_data


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id,expected_data",
    [
        (
            path.join(".", "tests", "resources", "mentors", "{}", "data"),
            "mentor_has_no_topics_csv",
            {
                "id": "mentor_has_no_topics_csv",
                "name": "Mentor Number 1",
                "short_name": "M1",
                "title": "First Example Mentor",
                "questions_by_id": {
                    "mentor_01_a1_1_1": {
                        "question_text": "Who are you and what do you do?"
                    }
                },
                "topics_by_id": {
                    "background": {
                        "name": "Background",
                        "questions": ["mentor_01_a1_1_1"],
                    },
                    "my_story": {"name": "My Story", "questions": ["mentor_01_a1_1_1"]},
                },
                "utterances_by_type": {
                    "_INTRO_": [
                        (
                            "mentor_01_u1_1_1",
                            "Hi, my name is Mentor 01 and this is my configured intro",
                        )
                    ],
                    "_REPEAT_": [("mentor_01_u2_1_1", "I may have said this before")],
                    "_FEEDBACK_": [("mentor_01_u3_1_1", "No")],
                    "_PROMPT_": [("mentor_01_u4_1_1", "Anything else?")],
                    "_OFF_TOPIC_": [
                        (
                            "mentor_01_u5_1_1",
                            "That is a great question. I wish I'd thought of that.",
                        )
                    ],
                    "_IDLE_": [("idle", "")],
                },
            },
        )
    ],
)
def test_it_uses_question_topics_when_no_topics_csv(
    mentor_data_root, mentor_id, expected_data
):
    m = Mentor(mentor_id, mentor_data_root=mentor_data_root)
    assert m.to_dict() == expected_data


@patch("mentorpal.mentor.logging")
@pytest.mark.parametrize(
    "mentor_data_root,mentor_id,expected_data",
    [
        (
            path.join(".", "tests", "resources", "mentors", "{}", "data"),
            "mentor_has_no_utterances_csv",
            {
                "id": "mentor_has_no_utterances_csv",
                "name": "Mentor Number 1",
                "short_name": "M1",
                "title": "First Example Mentor",
                "questions_by_id": {
                    "mentor_01_a1_1_1": {
                        "question_text": "Who are you and what do you do?"
                    }
                },
                "topics_by_id": {
                    "about_me": {"name": "About Me", "questions": ["mentor_01_a1_1_1"]}
                },
                "utterances_by_type": {
                    "_INTRO_": ["idle"],
                    "_OFF_TOPIC_": ["off_topic"],
                    "_PROMPT_": ["prompt"],
                    "_FEEDBACK_": ["feedback"],
                    "_REPEAT_": ["repeat"],
                    "_REPEAT_BUMP_": ["repeat_bump"],
                    "_PROFANITY_": ["profanity"],
                },
            },
        )
    ],
)
def test_it_uses_defaults_when_utterance_csv_is_missing_or_invalid(
    mock_logging, mentor_data_root, mentor_id, expected_data
):
    m = Mentor(mentor_id, mentor_data_root=mentor_data_root)
    utterance_csv_path = m.mentor_data_path("utterance_data.csv")
    assert utterance_csv_path == path.join(
        mentor_data_root.format(mentor_id), "utterance_data.csv"
    )
    mock_logging.warning.assert_called_once_with(
        f"failed to load utterances for {mentor_id}: [Errno 2] No such file or directory: '{utterance_csv_path}'"
    )
    assert m.to_dict() == expected_data
