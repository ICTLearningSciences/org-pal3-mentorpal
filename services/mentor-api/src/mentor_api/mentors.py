import random
from mentorpal.classifiers import ClassifierFactory
from mentorpal.mentor import Mentor
from mentorpal.classifiers import Classifier


class _APIClassifier(Classifier):
    """
    Wrapper classifier that applies some post processing we want in an API classifier.
    Specifically:

     - Translates OFF_TOPIC responses to prompts
    """

    def __init__(self, classifier, mentor):
        """
        Create an _APIClassifier instance that wraps/decorates another classifier

        Args:
            classifier: (Classifier)
        """
        assert isinstance(
            classifier, Classifier
        ), "invalid type for classifier (expected mentorpal.Classifier, encountered {}".format(
            type(classifier)
        )
        self.classifier = classifier
        self.mentor = mentor

    def get_answer(self, question, canned_question_match_disabled=False):
        answer = self.classifier.get_answer(question, canned_question_match_disabled)
        answer = self._off_topic_to_prompt(answer)
        return answer

    def _off_topic_to_prompt(self, cls_answer):
        assert len(cls_answer) == 3
        if (
            cls_answer[0] == "_OFF_TOPIC_"
            and "_OFF_TOPIC_" in self.mentor.utterances_prompts
        ):
            prompts = self.mentor.utterances_prompts["_OFF_TOPIC_"]
            i = random.randint(0, len(prompts) - 1)
            a_id, a_txt = prompts[i]
            return (a_id, a_txt, -100.0)
        else:
            return cls_answer


class MentorClassifierRegistry:
    """
    Enables find_or_create mentorpal.classifiers.Classifer by mentor_id
    """

    def __init__(self, classifier_factory):
        """
        Args:
            classifier_factory: (mentorpal.classifiers.ClassiferFactory)
        """
        assert isinstance(classifier_factory, ClassifierFactory)
        self.classifier_factory = classifier_factory
        self.mentor_classifiers_by_id = dict()

    def find_or_create(self, mentor_id):
        """
        Args:
            mentor_id: (str) id for a mentor

        Returns:
            classifier: (mentorpal.classifiers.Classifer)
        """
        classifier = self.mentor_classifiers_by_id.get(mentor_id)
        if classifier is None:
            mentor = Mentor(mentor_id)
            classifier = _APIClassifier(self.classifier_factory.create(mentor), mentor)
            self.mentor_classifiers_by_id[mentor_id] = classifier
        return classifier
