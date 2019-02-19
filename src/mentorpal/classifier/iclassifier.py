from abc import ABC, abstractmethod

class IClassifier(ABC):
    """
    A (MentorPAL) classifer takes a text-string question and returns an answer
    """

    @abstractmethod
    def get_answer(self, question):
        """
        Match a question to an answer.

        Args:
            question: (str) the question text

        Returns:
            answer_id: (str) the id for the answer (typically from a predetermined set)
            answer_text: (str) the text of the answer
            confidence: (float) 0.0-1.0 confidence score for the question-answer mapping
        """
        return "none", "none", 0.0
