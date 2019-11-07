import pytest

from pipeline.process import update_topics
from pipeline.topics import load_topics_by_question_from_list, QuestionTopics
from pipeline.utterances import Utterance, utterance_map_from_list


@pytest.mark.parametrize(
    "input_utterances,input_topics,expected_utterances",
    [
        (
            [
                Utterance(question="What is your name?", timeStart=0, timeEnd=1),
                Utterance(question="What is your quest?", timeStart=1, timeEnd=2),
                Utterance(
                    question="What is your favorite color?", timeStart=2, timeEnd=3
                ),
                Utterance(
                    question="What is the name of your cat?", timeStart=3, timeEnd=4
                ),
            ],
            [
                QuestionTopics(question="what is your name", topics=["Background"]),
                QuestionTopics(
                    question="what is your quest", topics=["Background", "Quests"]
                ),
                QuestionTopics(
                    question="what is your favorite color", topics=["About Me"]
                ),
            ],
            [
                Utterance(
                    question="What is your name?",
                    topics=["Background"],
                    timeStart=0,
                    timeEnd=1,
                ),
                Utterance(
                    question="What is your quest?",
                    topics=["Background", "Quests"],
                    timeStart=1,
                    timeEnd=2,
                ),
                Utterance(
                    question="What is your favorite color?",
                    topics=["About Me"],
                    timeStart=2,
                    timeEnd=3,
                ),
                Utterance(
                    question="What is the name of your cat?", timeStart=3, timeEnd=4
                ),
            ],
        )
    ],
)
def test_utterances_update_topics(input_utterances, input_topics, expected_utterances):
    utterances = utterance_map_from_list(input_utterances)
    topics = load_topics_by_question_from_list(input_topics)
    actual_utterances = update_topics(utterances, topics)
    assert (
        utterance_map_from_list(expected_utterances).to_dict()
        == actual_utterances.to_dict()
    )
