import random
from typing import Tuple

from mentor_classifier.classifiers import ClassifierFactory
from mentor_classifier.mentor import Mentor
from mentor_classifier.classifiers import Classifier


class _APIClassifier(Classifier):
    """
    Wrapper classifier that applies some post processing we want in an API classifier.
    Specifically:

     - Translates OFF_TOPIC responses to prompts
    """

    def __init__(self, classifier: Classifier, mentor: Mentor):
        """
        Create an _APIClassifier instance that wraps/decorates another classifier

        Args:
            classifier: (Classifier)
        """
        assert isinstance(
            classifier, Classifier
        ), "invalid type for classifier (expected mentor_classifier.Classifier, encountered {}".format(
            type(classifier)
        )
        self.classifier = classifier
        self.mentor = mentor

    def get_answer(
        self, question: str, canned_question_match_disabled: bool = False
    ) -> Tuple[str, str, str]:
        answer = self.classifier.get_answer(question, canned_question_match_disabled)
        answer = self._off_topic_to_prompt(answer)
        return answer

    def get_classifier_id(self) -> str:
        return self.classifier.get_classifier_id()

    def _off_topic_to_prompt(
        self, cls_answer: Tuple[str, str, str]
    ) -> Tuple[str, str, str]:
        assert len(cls_answer) == 3
        if (
            cls_answer[0] == "_OFF_TOPIC_"
            and "_OFF_TOPIC_" in self.mentor.utterances_by_type
        ):
            prompts = self.mentor.utterances_by_type["_OFF_TOPIC_"]
            i = random.randint(0, len(prompts) - 1)
            a_id, a_txt = prompts[i]
            return (a_id, a_txt, -100.0)
        else:
            return cls_answer


class MentorClassifierRegistry:
    """
    Enables find_or_create mentor_classifier.classifiers.Classifer by mentor_id
    """

    def __init__(self, classifier_factory):
        """
        Args:
            classifier_factory: (mentor_classifier.classifiers.ClassiferFactory)
        """
        assert isinstance(classifier_factory, ClassifierFactory)
        self.classifier_factory = classifier_factory
        self.mentor_classifiers_by_id = dict()

    def find_or_create(self, mentor_id):
        """
        Args:
            mentor_id: (str) id for a mentor

        Returns:
            classifier: (mentor_classifier.classifiers.Classifer)
        """
        classifier = self.mentor_classifiers_by_id.get(mentor_id)
        if classifier is None:
            mentor = Mentor(mentor_id)
            classifier = _APIClassifier(self.classifier_factory.create(mentor), mentor)
            self.mentor_classifiers_by_id[mentor_id] = classifier
        return classifier
