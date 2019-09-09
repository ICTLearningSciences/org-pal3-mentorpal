import pandas as pd
import os
import csv

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


class Mentor(object):
    def __init__(self, id, mentor_data_root=None):
        self.id = id
        self.__mentor_data_root = mentor_data_root or os.path.join(
            "mentors", self.id, "data"
        )
        self.name = None
        self.short_name = None
        self.title = None

        self.topics = []
        self.utterances_prompts = {}  # responses for the special cases
        self.suggestions = {}
        self.ids_answers = {}
        self.answer_ids = {}
        self.ids_questions = {}
        self.question_ids = {}

        self.load()

    def get_id(self):
        return self.id

    def mentor_data_path(self, p):
        return os.path.join(self.__mentor_data_root, p)

    def load(self):
        self.name, self.short_name, self.title = self.load_mentor_data()
        self.topics = self.load_topics()
        self.utterances_prompts = self.load_utterances()
        self.suggestions = self.load_suggestions()
        self.ids_answers, self.answer_ids, self.ids_questions, self.question_ids = (
            self.load_ids_answers()
        )

    def load_mentor_data(self):
        with open(self.mentor_data_path("profile.yml")) as f:
            data = load(f, Loader=Loader)
            return data["name"], data["short_name"], data["title"]
        return None, None, None

    def load_topics(self):
        topics = []
        with open(self.mentor_data_path("topics.csv")) as f:
            reader = csv.reader(f)
            for row in reader:
                topics.append(row[0].lower())
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
        return topics

    def load_utterances(self):
        utterances_prompts = {}
        utterance_df = pd.read_csv(
            open(self.mentor_data_path("utterance_data.csv"), "rb")
        )
        for i in range(len(utterance_df)):
            situation = utterance_df.iloc[i]["situation"]
            video_name = utterance_df.iloc[i]["ID"]
            utterance = utterance_df.iloc[i]["utterance"]
            if situation in utterances_prompts:
                utterances_prompts[situation].append((video_name, utterance))
            else:
                utterances_prompts[situation] = [(video_name, utterance)]
        return utterances_prompts

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
        for i in range(0, len(corpus)):
            ID = corpus.iloc[i]["ID"]
            answer = corpus.iloc[i]["text"]
            answer = answer.replace("\u00a0", " ")
            answer_ids[answer] = ID
            ids_answers[ID] = answer
            questions = corpus.iloc[i]["question"].split("\n")
            for question in questions:
                question = sanitize_string(question)
                question_ids[question] = ID
            ids_questions[ID] = questions
        return ids_answers, answer_ids, ids_questions, question_ids
