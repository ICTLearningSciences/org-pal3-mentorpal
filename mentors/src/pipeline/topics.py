import csv
from dataclasses import asdict, dataclass, field
import logging
import os
import re
from typing import Dict, List, Union


def to_question_id(q: str) -> str:
    # result string will be lowercase, only alphanumeric, tokens separated by _, and no leading or trailing _
    return re.sub(
        "^[^a-zA-Z0-9]+",
        "",
        re.sub("[^a-zA-Z0-9]+$", "", re.sub("[^a-zA-Z0-9]+", "_", q.lower())),
    )


@dataclass
class QuestionTopics:
    question: str = ""
    topics: List[str] = field(default_factory=lambda: [])

    def to_dict(self):
        return asdict(self)


@dataclass
class TopicsByQuestion:
    questionsTopicsById: Dict[str, QuestionTopics] = field(default_factory=lambda: {})

    def __post_init__(self):
        self.questionsTopicsById = {
            to_question_id(k): v
            if isinstance(v, QuestionTopics)
            else QuestionTopics(**v)
            for (k, v) in self.questionsTopicsById.items()
        }

    def find_topics(self, question: str) -> List[str]:
        qt = self.questionsTopicsById.get(to_question_id(question))
        return (qt.topics or []) if qt else []

    def to_dict(self):
        return asdict(self)


def load_topics_by_question_from_list(
    question_topics_list: List[Union[QuestionTopics, dict]]
) -> TopicsByQuestion:
    xlist = [
        x if isinstance(x, QuestionTopics) else QuestionTopics(**x)
        for x in question_topics_list
    ]
    return TopicsByQuestion(
        **dict(questionsTopicsById={to_question_id(x.question): x for x in xlist})
    )


def load_topics_by_question_from_csv(
    question_topics_csv: str,
    allow_file_not_exists: bool = False,
    warn_on_file_not_exists: bool = True,
) -> TopicsByQuestion:
    if not os.path.isfile(question_topics_csv):
        if allow_file_not_exists:
            if warn_on_file_not_exists:
                logging.warning(
                    f"no topics_by_question csv file found at {question_topics_csv}"
                )
            return TopicsByQuestion()
        else:
            raise Exception(
                f"expected topics_by_question csv file at {question_topics_csv} (or pass allow_file_not_exists=True)"
            )

    try:
        with open(question_topics_csv, "r", encoding="utf-8") as f:
            r = csv.reader(f)
            xlist = [
                QuestionTopics(
                    question=x[0], topics=x[1].split("|")
                )  # topic list is delimited with |
                for i, x in enumerate(r)
                if i != 0 and len(x) >= 2  # skip header row and trailing/empty
            ]
            return TopicsByQuestion(
                **dict(
                    questionsTopicsById={to_question_id(x.question): x for x in xlist}
                )
            )
    except Exception as root_err:
        logging.warning(f"error parsing {question_topics_csv}: {root_err}")
