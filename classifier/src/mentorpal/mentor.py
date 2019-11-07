import csv
import logging
import os
import re
from typing import Any, Dict, List

import pandas as pd
from yaml import load

try:
    from yaml import CLoader as Loader
except ImportError:
    from yaml import Loader

from mentorpal.utils import normalize_topics, sanitize_string

STRIP_TOPICS = [
    "navy",
    "positive",
    "negative",
]  # TODO: this should NOT be hardcoded in this class


def _add_question_to_list(question_id: str, questions: List[str]) -> List[str]:
    questions = questions or []
    questions.append(question_id)
    return questions


def _add_question_to_topics(
    question_id: str,
    topic_csv: str,
    topics_by_id: Dict[str, Any],
    topic_id_default,
    topic_id_by_question_topic_id: Dict[str, str] = None,
    use_question_topics=False,
) -> None:
    n_topics = 0
    use_question_topics = use_question_topics or not topic_id_by_question_topic_id
    try:
        for question_topic in topic_csv.split(","):
            question_topic_id = _to_id(question_topic)
            topic_id = (
                topic_id_by_question_topic_id.get(question_topic_id)
                if not use_question_topics
                else question_topic_id
            )
            if not topic_id:
                logging.debug(f"no topic for topic id {question_topic_id}")
                continue
            if use_question_topics and topic_id not in topics_by_id:
                topics_by_id[topic_id] = _new_topic(question_topic)
            topic = topics_by_id[topic_id]
            topic["questions"] = topic["questions"] or []
            topic["questions"].append(question_id)
            n_topics += 1
    except BaseException as err:
        logging.warning(
            f"error adding question {question_id} to topics {topic_csv}: {err}"
        )
    if n_topics == 0:
        logging.warning(
            f"No mapped topic found for question {question_id} so adding to default topic {topic_id_default}"
        )
        default_topic = topics_by_id[topic_id_default]
        default_topic["questions"] = _add_question_to_list(
            question_id, default_topic.get("questions")
        )


def _new_topic(name: str):
    return {"name": name, "questions": []}


def to_unique_sorted(a: List[str]) -> List[str]:
    a.sort()
    return [s for i, s in enumerate(a) if i == 0 or a[i] != a[i - 1]]


def _to_id(s: str, lower: bool = True) -> str:
    # TODO: should always do lower but requires converting existing assets
    s = s.lower() if lower else s
    return re.sub(r"[^a-zA-Z0-9]+", r"_", s.strip())


class Mentor(object):
    def __init__(self, id, mentor_data_root=None, topic_name_default="About Me"):
        self.id = id
        self.__mentor_data_root = os.path.join(
            mentor_data_root or "mentors", self.id, "data"
        )
        self.name = None
        self.short_name = None
        self.title = None
        self.topic_name_default = topic_name_default
        self.topic_id_default = _to_id(topic_name_default)
        self.topics = []
        self.topics_by_id = {}
        self.utterances_by_type = {}  # responses for the special cases
        self.suggestions = {}
        self.ids_answers = {}
        self.answer_ids = {}
        self.ids_questions = {}
        self.question_ids = {}
        self.questions_by_id = {}
        self.topic_id_by_question_topic_id = {}
        self.load()

    def find_id_for_answer_text(self, answer_text: str) -> str:
        return self.answer_ids.get(answer_text)

    def get_id(self):
        return self.id

    def mentor_data_path(self, p=None):
        return (
            os.path.join(self.__mentor_data_root, p) if p else self.__mentor_data_root
        )

    def load(self):
        self.name, self.short_name, self.title = self.__load_profile()
        self.topics, self.topics_by_id, self.topic_id_by_question_topic_id = (
            self.load_topics()
        )
        self.utterances_by_type = self.load_utterances()
        self.suggestions = self.load_suggestions()
        self.ids_answers, self.answer_ids, self.ids_questions, self.question_ids, self.questions_by_id = (
            self.load_ids_answers()
        )

    def __load_profile(self) -> (str, str, str):
        try:
            with open(self.mentor_data_path("profile.yml")) as f:
                data = load(f, Loader=Loader)
                return (
                    data["name"] or self.id,
                    data["short_name"] or self.id,
                    data["title"] or "mentor",
                )
        except BaseException as err:
            logging.warning(f"failed to load profile for {self.id}: {err}")
        return self.id, self.id, "mentor"

    def load_topics(self):
        topics = []
        topics_by_id = {self.topic_id_default: _new_topic(self.topic_name_default)}
        topic_id_by_question_topic_id = {}
        try:
            with open(self.mentor_data_path("topics.csv")) as f:
                reader = csv.reader(f)
                for row in reader:
                    topics.append(row[0].lower())
                    topic_id = _to_id(row[0])
                    parent_topic_id = _to_id(row[1])
                    topic_id_by_question_topic_id[topic_id] = parent_topic_id
                    if parent_topic_id not in topics_by_id:
                        topics_by_id[parent_topic_id] = _new_topic(row[1])
            # don't include these topics: navy positive negative
            for t in STRIP_TOPICS:
                if t in topics:
                    topics.remove(t)
            topics = [_f.title() for _f in topics]
            # normalize topic names
            for i in range(len(topics)):
                if topics[i] == "Jobspecific":
                    topics[i] = "JobSpecific"
                if topics[i] == "Stem":
                    topics[i] = "STEM"
        except BaseException as err:
            self.use_question_topics = True
            logging.warning(f"failed to load topics for {self.id}: {err}")
        return topics, topics_by_id, topic_id_by_question_topic_id

    def load_utterances(self):
        utterances_by_type = {}
        try:
            utterance_df = pd.read_csv(
                open(self.mentor_data_path("utterance_data.csv"), "rb")
            )
            corpus = utterance_df.fillna("")
            for i in range(len(corpus)):
                situation = corpus.iloc[i]["situation"]
                video_name = corpus.iloc[i]["ID"]
                utterance = corpus.iloc[i]["utterance"]
                if situation in utterances_by_type:
                    utterances_by_type[situation].append((video_name, utterance))
                else:
                    utterances_by_type[situation] = [(video_name, utterance)]
            return utterances_by_type
        except BaseException as err:
            logging.warning(f"failed to load utterances for {self.id}: {str(err)}")
        return {
            "_INTRO_": ["idle"],
            "_OFF_TOPIC_": ["off_topic"],
            "_PROMPT_": ["prompt"],
            "_FEEDBACK_": ["feedback"],
            "_REPEAT_": ["repeat"],
            "_REPEAT_BUMP_": ["repeat_bump"],
            "_PROFANITY_": ["profanity"],
        }

    def load_suggestions(self):
        suggestions = {}
        classifier_data = pd.read_csv(self.mentor_data_path("classifier_data.csv"))
        corpus = classifier_data.fillna("")
        for i in range(0, len(corpus)):
            topics = corpus.iloc[i]["topics"].split(",")
            topics = [_f for _f in topics if _f]
            # normalize the topics
            topics = normalize_topics(topics)
            questions = corpus.iloc[i]["question"].split("\n")
            questions = [_f for _f in questions if _f]
            answer = corpus.iloc[i]["text"]
            answer_id = corpus.iloc[i]["ID"]
            # remove nbsp and \"
            answer = answer.replace("\u00a0", " ")
            for question in questions:
                for topic in topics:
                    if topic != "Navy" or topic != "Positive" or topic != "Negative":
                        if topic in suggestions:
                            suggestions[topic].append((question, answer, answer_id))
                        else:
                            suggestions[topic] = [(question, answer, answer_id)]
        return suggestions

    def load_ids_answers(self):
        classifier_data = pd.read_csv(self.mentor_data_path("classifier_data.csv"))
        corpus = classifier_data.fillna("")
        answer_ids = {}
        ids_answers = {}
        question_ids = {}
        ids_questions = {}
        questions_by_id = {}
        for i in range(0, len(corpus)):
            id = corpus.iloc[i]["ID"]
            answer = corpus.iloc[i]["text"]
            topics_csv = corpus.iloc[i]["topics"]
            answer = answer.replace("\u00a0", " ")
            answer_ids[answer] = id
            ids_answers[id] = answer
            questions = corpus.iloc[i]["question"].split("\n")
            for i, question in enumerate(questions):
                question_ids[sanitize_string(question)] = id
                if i == 0:
                    questions_by_id[id] = {"question_text": question}
                _add_question_to_topics(
                    id,
                    topics_csv,
                    self.topics_by_id,
                    self.topic_id_default,
                    topic_id_by_question_topic_id=self.topic_id_by_question_topic_id,
                )
            ids_questions[id] = questions
        for tid in [k for k in self.topics_by_id.keys()]:
            topic = self.topics_by_id[tid]
            if not topic["questions"] or len(topic["questions"]) == 0:
                del self.topics_by_id[tid]
                continue
            topic["questions"] = to_unique_sorted(topic["questions"])
        return ids_answers, answer_ids, ids_questions, question_ids, questions_by_id

    def to_dict(self):
        return dict(
            id=self.get_id(),
            name=self.name,
            short_name=self.short_name,
            title=self.title,
            questions_by_id=self.questions_by_id,
            topics_by_id=self.topics_by_id,
            utterances_by_type=self.utterances_by_type,
        )
