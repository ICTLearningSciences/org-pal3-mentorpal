from dataclasses import dataclass, field
import os
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
COLS_UTTERANCE_DATA: List[str] = ["ID", "utterance", "situation"]


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
        self.data.append(  # pylint: disable=no-member
            QuestionsParaphrasesAnswersRow(
                question=question, answer=answer, mentor_id=mentor_id
            )
        )

    def to_data_frame(self) -> pd.DataFrame:
        return pd.DataFrame(
            [r.to_row() for r in self.data],  # pylint: disable=not-an-iterable
            columns=COLS_QUESTIONS_PARAPHRASES_ANSWERS,
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
        self.data.append(  # pylint: disable=no-member
            PromptsUtterancesRow(
                mentor_id=mentor_id, situation=situation, utterance=utterance
            )
        )

    def to_data_frame(self) -> pd.DataFrame:
        return pd.DataFrame(
            [r.to_row() for r in self.data],  # pylint: disable=not-an-iterable
            columns=COLS_PROMPTS_UTTERANCES,
        )


@dataclass
class UtteranceDataRow:
    ID: str = ""
    utterance: str = ""
    situation: str = ""

    def to_row(self) -> List[str]:
        return [self.ID, self.utterance, self.situation]


@dataclass
class UtteranceDataBuilder:
    data: List[UtteranceDataRow] = field(default_factory=lambda: [])

    def add_row(self, id: str = "", utterance: str = "", situation: str = "") -> None:
        self.data.append(  # pylint: disable=no-member
            UtteranceDataRow(ID=id, utterance=utterance, situation=situation)
        )

    def to_data_frame(self) -> pd.DataFrame:
        return pd.DataFrame(
            [r.to_row() for r in self.data],  # pylint: disable=not-an-iterable
            columns=COLS_PROMPTS_UTTERANCES,
        )


def _add_file_if_dir(base_path, file_name: str) -> str:
    return os.path.join(base_path, file_name) if os.path.isdir(base_path) else base_path


def load_questions_paraphrases_answers(csv_path: str) -> pd.DataFrame:
    return pd.read_csv(
        _add_file_if_dir(csv_path, "questions_paraphrases_answers.csv")
    ).fillna("")


def load_prompts_utterances(csv_path: str) -> pd.DataFrame:
    return pd.read_csv(_add_file_if_dir(csv_path, "prompts_utterances.csv")).fillna("")


def load_utterance_data(csv_path: str) -> pd.DataFrame:
    return pd.read_csv(_add_file_if_dir(csv_path, "utterance_data.csv")).fillna("")


def write_questions_paraphrases_answers(d: pd.DataFrame, csv_path: str) -> None:
    os.makedirs(csv_path, exist_ok=True)
    d.fillna("").to_csv(
        _add_file_if_dir(csv_path, "questions_paraphrases_answers.csv"), index=False
    )


def write_prompts_utterances(d: pd.DataFrame, csv_path: str) -> None:
    os.makedirs(csv_path, exist_ok=True)
    d.fillna("").to_csv(
        _add_file_if_dir(csv_path, "prompts_utterances.csv"), index=False
    )


def write_utterance_data(d: pd.DataFrame, csv_path: str) -> None:
    os.makedirs(csv_path, exist_ok=True)
    d.fillna("").to_csv(_add_file_if_dir(csv_path, "utterance_data.csv"), index=False)
