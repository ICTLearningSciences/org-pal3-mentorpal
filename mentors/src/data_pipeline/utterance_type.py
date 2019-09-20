from enum import Enum


class UtteranceType(Enum):
    ANSWER = "_ANSWER_"
    FEEDBACK = "_FEEDBACK_"
    INTRO = "_INTRO_"
    OFF_TOPIC = "_OFF_TOPIC_"
    PROFANITY = "_PROFANITY_"
    PROMPT = "_PROMPT_"
    REPEAT = "_REPEAT_"

    @classmethod
    def for_value(cls, v: str, dfault: "UtteranceType" = None) -> "UtteranceType":
        # TODO: in python 3.7+ use real UtteranceType type above
        for m in cls.__members__.values():
            if m.value == v:
                return m
        return dfault
