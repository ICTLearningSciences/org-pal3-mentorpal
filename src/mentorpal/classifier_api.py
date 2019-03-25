import random

from mentorpal.iclassifier import IClassifier


class APIClassifier(IClassifier):
    """
    Wrapper classifier that applies some post processing we want in an API classifier.
    Specifically:

     - Translates OFF_TOPIC responses to prompts 
    """


    def __init__(self, classifier, mentor):
        '''
        Create an APIClassifier instance that wraps/decorates another classifier

        Args:
            classifier: (IClassifier)
        '''
        assert isinstance(classifier, IClassifier), \
            'invalid type for classifier (expected mentorpal.IClassifier, encountered {}'.format(type(classifier))
        self.classifier = classifier
        self.mentor = mentor


    def get_answer(self, question):
        answer = self.classifier.get_answer(question)
        answer = self._off_topic_to_prompt(answer)
        return answer

    def _off_topic_to_prompt(self, cls_answer):
        assert len(cls_answer) == 3
        if cls_answer[0] == '_OFF_TOPIC_' and '_OFF_TOPIC_' in self.mentor.utterances_prompts:
            prompts = self.mentor.utterances_prompts['_OFF_TOPIC_']
            i = random.randint(0, len(prompts) - 1)
            a_id, a_txt = prompts[i]
            return (a_id, a_txt, -100.0)
        else:
            return cls_answer

    