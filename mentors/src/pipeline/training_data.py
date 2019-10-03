from dataclasses import dataclass, field
from typing import List

import pandas as pd


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
    answer: str = ""
    helpers: str = None
    mentor_id: str = ""
    question: str = ""
    topics: List[str] = None

    def to_row(self) -> List[str]:
        return [
            ",".join(self.topics) if self.topics else "",
            self.helpers or "",
            self.mentor_id or "",
            self.question or "",
            self.answer or "",
        ]


@dataclass
class QuestionsParaphrasesAnswersBuilder:
    data: List[QuestionsParaphrasesAnswersRow] = field(default_factory=lambda: [])

    def add_row(
        self, question: str = "", answer: str = "", mentor_id: str = ""
    ) -> None:
        self.data.append(
            QuestionsParaphrasesAnswersRow(
                question=question, answer=answer, mentor_id=mentor_id
            )
        )

    def to_data_frame(self) -> pd.DataFrame:
        return pd.DataFrame(
            [r.to_row() for r in self.data], columns=COLS_QUESTIONS_PARAPHRASES_ANSWERS
        )


@dataclass
class PromptsUtterancesRow:
    mentor_id: str = ""
    situation: str = None
    utterance: str = ""

    def to_row(self) -> List[str]:
        return [self.situation, self.mentor_id, self.utterance]


@dataclass
class PromptsUtterancesBuilder:
    data: List[PromptsUtterancesRow] = field(default_factory=lambda: [])

    def add_row(
        self, mentor_id: str = "", situation: str = "", utterance: str = ""
    ) -> None:
        self.data.append(
            PromptsUtterancesRow(
                mentor_id=mentor_id, situation=situation, utterance=utterance
            )
        )

    def to_data_frame(self) -> pd.DataFrame:
        return pd.DataFrame(
            [r.to_row() for r in self.data], columns=COLS_PROMPTS_UTTERANCES
        )


def load_questions_paraphrases_answers(csv_path: str) -> pd.DataFrame:
    return pd.read_csv(csv_path).fillna("")


def load_prompts_utterances(csv_path: str) -> pd.DataFrame:
    return pd.read_csv(csv_path).fillna("")


def write_questions_paraphrases_answers(d: pd.DataFrame, csv_path: str) -> None:
    d.fillna("").to_csv(csv_path, index=False)
