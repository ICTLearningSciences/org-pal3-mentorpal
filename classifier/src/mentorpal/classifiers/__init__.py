import os

from abc import ABC, abstractmethod
from importlib import import_module


class Classifier(ABC):
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


class CheckpointClassifierFactory(ABC):
    """
    A factory that creates a mentorpal.classifiers.Classifier given a checkpoint and mentor[s].
    Generally associated with a specific architecture, but not a specific checkpoint
    """

    @abstractmethod
    def create(self, checkpoint, mentors):
        """
        Creates a mentorpal.classifiers.Classifier given a checkpoint and mentor[s]

        Args:
            checkpoint: (str) id for the checkpoint
            mentors: (str|mentorpal.mentor.Mentor|list of mentors/mentor ids) mentor[s] used in classifier

        Returns:
            classifier: (mentorpal.classifiers.Classifier)
        """
        return None


class ClassifierFactory:
    """
    A factory that creates a mentorpal.classifiers.Classifier given mentor[s].
    Generally already associated with a specific architecture and checkpoint
    """

    def __init__(self, checkpoint_classifier_factory, checkpoint):
        assert isinstance(checkpoint_classifier_factory, CheckpointClassifierFactory)
        assert isinstance(checkpoint, str)
        self.checkpoint_classifier_factory = checkpoint_classifier_factory
        self.checkpoint = checkpoint

    def create(self, mentors):
        """
        Creates a mentorpal.classifiers.Classifier given mentor[s]

        Args:
            mentors: (str|mentorpal.mentor.Mentor|list of mentors/mentor ids) mentor[s] used in classifier

        Returns:
            classifier: (mentorpal.classifiers.Classifier)
        """
        return self.checkpoint_classifier_factory.create(self.checkpoint, mentors)


_factories_by_arch = {}


def checkpoint_path(arch, checkpoint, checkpoint_root):
    return os.path.join(checkpoint_root, "classifiers", arch, checkpoint)


def create_classifier(arch, checkpoint, mentors, checkpoint_root):
    """
        Creates a mentorpal.classifiers.Classifier given a checkpoint and mentor[s].

        Args:
            arch: (str) id for the architecture
            checkpoint: (str) id for the checkpoint
            mentors: (str|mentorpal.mentor.Mentor|list of mentors/mentor ids) mentor[s] used in classifier
            checkpoint_root: (str) root path of checkpoints.
        Returns:
            classifier: (mentorpal.classifiers.Classifier)
    """
    return create_classifier_factory(arch, checkpoint, checkpoint_root).create(mentors)


def register_classifier_factory(arch, fac):
    """
        Register a mentorpal.classifiers.CheckpointClassifierFactory for an arch

        Args:
            arch: (str) id for the architecture
        """
    assert isinstance(arch, str)
    assert isinstance(fac, CheckpointClassifierFactory)
    _factories_by_arch[arch] = fac


def create_classifier_factory(arch, checkpoint, checkpoint_root):
    """
        Creates a mentorpal.classifiers.ClassifierFactory given an arch and checkpoint.

        Args:
            arch: (str) id for the architecture
            checkpoint: (str) id for the checkpoint

        Returns:
            classifier: (mentorpal.classifiers.ClassifierFactory)
    """
    assert isinstance(arch, str)
    assert isinstance(checkpoint, str)
    assert isinstance(checkpoint_root, str)
    if arch not in _factories_by_arch:
        import_module(f"mentorpal.classifiers.arch.{arch}")
    checkpoint_fac = _factories_by_arch[arch]
    assert isinstance(checkpoint_fac, CheckpointClassifierFactory)
    return ClassifierFactory(
        checkpoint_fac, checkpoint_path(arch, checkpoint, checkpoint_root)
    )
