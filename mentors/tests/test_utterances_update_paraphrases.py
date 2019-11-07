import pytest

from pipeline.process import update_paraphrases
from pipeline.paraphrases import (
    load_paraphrases_by_question_from_list,
    QuestionParaphrases,
)
from pipeline.utterances import Utterance, utterance_map_from_list


@pytest.mark.parametrize(
    "input_utterances,input_paraphrases,expected_utterances",
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
                QuestionParaphrases(
                    question="what is your name", paraphrases=["Background"]
                ),
                QuestionParaphrases(
                    question="what is your quest", paraphrases=["Background", "Quests"]
                ),
                QuestionParaphrases(
                    question="what is your favorite color", paraphrases=["About Me"]
                ),
            ],
            [
                Utterance(
                    question="What is your name?",
                    paraphrases=["Background"],
                    timeStart=0,
                    timeEnd=1,
                ),
                Utterance(
                    question="What is your quest?",
                    paraphrases=["Background", "Quests"],
                    timeStart=1,
                    timeEnd=2,
                ),
                Utterance(
                    question="What is your favorite color?",
                    paraphrases=["About Me"],
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
def test_utterances_update_paraphrases(
    input_utterances, input_paraphrases, expected_utterances
):
    utterances = utterance_map_from_list(input_utterances)
    paraphrases = load_paraphrases_by_question_from_list(input_paraphrases)
    actual_utterances = update_paraphrases(utterances, paraphrases)
    assert (
        utterance_map_from_list(expected_utterances).to_dict()
        == actual_utterances.to_dict()
    )
