import pytest


@pytest.mark.parametrize(
    "mentor_id,expected_data",
    [
        (
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
                        [
                            "mentor_01_u1_1_1",
                            "Hi, my name is Mentor 01 and this is my configured intro",
                        ]
                    ],
                    "_REPEAT_": [["mentor_01_u2_1_1", "I may have said this before"]],
                    "_FEEDBACK_": [["mentor_01_u3_1_1", "No"]],
                    "_PROMPT_": [["mentor_01_u4_1_1", "Anything else?"]],
                    "_OFF_TOPIC_": [
                        [
                            "mentor_01_u5_1_1",
                            "That is a great question. I wish I'd thought of that.",
                        ]
                    ],
                    "_IDLE_": [["idle", ""]],
                },
            },
        )
    ],
)
def test_it_returns_a_manifest_of_data_for_a_mentor(mentor_id, expected_data, client):
    res = client.get(f"/mentor-api/mentors/{mentor_id}/data")
    assert res.status_code == 200
    assert res.json == expected_data
