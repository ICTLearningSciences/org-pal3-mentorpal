from dataclasses import asdict, dataclass, field
from typing import Dict, List

import pandas as pd

from utterance_type import UtteranceType
from utils import yaml_load


COLS_QUESTIONS_PARAPHRASES_ANSWERS: List[str] = [
    "Topics",
    "Helpers",
    "Mentor",
    "Question",
    "text",
]
COLS_PROMPTS_UTTERANCES: List[str] = ["Situation", "Mentor", "Utterance/Prompt"]


@dataclass
class QuestionsParaphrasesAnswersRow:
    topics: List[str] = None
    helpers: str = None
    question: str = ""
    answer: str = ""

    def to_row(self, mentor_id: str) -> List[str]:
        return [
            ",".join(self.topics) if self.topics else "",
            self.helpers or "",
            mentor_id or "",
            self.question or "",
            self.answer or "",
        ]


@dataclass
class QuestionsParaphrasesAnswersBuilder:
    mentor_id: str
    data: List[QuestionsParaphrasesAnswersRow] = field(default_factory=lambda: [])

    def add_row(self, question="", answer="") -> None:
        self.data.append(
            QuestionsParaphrasesAnswersRow(question=question, answer=answer)
        )

    def to_data_frame(self) -> pd.DataFrame:
        return pd.DataFrame(
            [r.to_row(self.mentor_id) for r in self.data],
            columns=COLS_QUESTIONS_PARAPHRASES_ANSWERS,
        )


@dataclass
class PromptsUtterancesRow:
    situation: str = None
    utterance: str = ""

    def to_row(self, mentor_id: str) -> List[str]:
        return [self.situation, mentor_id, self.utterance]


@dataclass
class PromptsUtterancesBuilder:
    mentor_id: str
    data: List[PromptsUtterancesRow] = field(default_factory=lambda: [])

    def add_row(self, situation="", utterance="") -> None:
        self.data.append(PromptsUtterancesRow(situation=situation, utterance=utterance))

    def to_data_frame(self) -> pd.DataFrame:
        return pd.DataFrame(
            [r.to_row(self.mentor_id) for r in self.data],
            columns=COLS_PROMPTS_UTTERANCES,
        )
