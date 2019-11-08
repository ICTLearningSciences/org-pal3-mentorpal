from abc import ABC, abstractmethod
from importlib import import_module
import logging
import os
from typing import List, Tuple, Union

from mentorpal.checkpoints import ARCH_DEFAULT, CHECKPOINT_ROOT_DEFAULT, find_checkpoint
from mentorpal.mentor import Mentor


class Classifier(ABC):
    """
    A (MentorPAL) classifer takes a text-string question and returns an answer
    """

    @abstractmethod
    def get_answer(
        self, question: str, canned_question_match_disabled: bool = False
    ) -> Tuple[str, str, str]:
        """
        Match a question to an answer.

        Args:
            question: (str) the question text
            canned_question_match_disabled: (bool) if true, don't use exact match answers for known questions

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
    def create(
        self, checkpoint: str = None, mentors: Union[str, Mentor, List[str]] = None
    ) -> Classifier:
        """
        Creates a mentorpal.classifiers.Classifier given a checkpoint and mentor[s]

        Args:
            checkpoint: id for the checkpoint. Defaults to newest found (alpha by name)
            mentors: mentor[s] used in classifier. Defaults to all found

        Returns:
            classifier: (mentorpal.classifiers.Classifier)
        """
        return None


class ClassifierFactory:
    """
    A factory that creates a mentorpal.classifiers.Classifier given mentor[s].
    Generally already associated with a specific architecture and checkpoint
    """

    def __init__(
        self,
        checkpoint_classifier_factory: CheckpointClassifierFactory,
        checkpoint: str = None,
    ):
        assert isinstance(checkpoint_classifier_factory, CheckpointClassifierFactory)
        assert isinstance(checkpoint, str)
        self.checkpoint_classifier_factory = checkpoint_classifier_factory
        self.checkpoint = checkpoint

    def create(self, mentors: Union[str, Mentor, List[str]]) -> Classifier:
        """
        Creates a mentorpal.classifiers.Classifier given mentor[s]

        Args:
            mentors: mentor[s] used in classifier. Defaults to all found

        Returns:
            classifier: (mentorpal.classifiers.Classifier)
        """
        return self.checkpoint_classifier_factory.create(self.checkpoint, mentors)


_factories_by_arch = {}


def checkpoint_path(checkpoint_root: str, arch: str, checkpoint: str) -> str:
    return os.path.join(checkpoint_root, "classifiers", arch, checkpoint)


def create_classifier(
    checkpoint_root: str = CHECKPOINT_ROOT_DEFAULT,
    arch: str = ARCH_DEFAULT,
    checkpoint: str = None,
    mentors: List[str] = None,
):
    """
        Creates a mentorpal.classifiers.Classifier given a checkpoint and mentor[s].

        Args:
            checkpoint_root: (str) root path of checkpoints.
            arch: (str) id for the architecture. If not passed expect to find just one registered
            checkpoint: (str) id for the checkpoint. If not passed looks for newest (alphabetical by name)
            mentors: (str|mentorpal.mentor.Mentor|list of mentors/mentor ids) mentor[s] used in classifier
        Returns:
            classifier: (mentorpal.classifiers.Classifier)
    """
    return create_classifier_factory(arch, checkpoint, checkpoint_root).create(mentors)


def register_classifier_factory(arch: str, fac: CheckpointClassifierFactory) -> None:
    """
        Register a mentorpal.classifiers.CheckpointClassifierFactory for an arch

        Args:
            arch: (str) id for the architecture
        """
    assert isinstance(arch, str)
    assert isinstance(fac, CheckpointClassifierFactory)
    _factories_by_arch[arch] = fac


def create_classifier_factory(
    checkpoint_root: str = None,
    arch: str = None,
    checkpoint: str = None,
):
    """
        Creates a mentorpal.classifiers.ClassifierFactory given an arch and checkpoint.

        Args:
            arch: (str) id for the architecture
            checkpoint: (str) id for the checkpoint

        Returns:
            classifier: (mentorpal.classifiers.ClassifierFactory)
    """
    checkpoint_root = checkpoint_root or CHECKPOINT_ROOT_DEFAULT
    arch = arch or ARCH_DEFAULT
    logging.warning(
        f"create classifier factory checkpoint_root={checkpoint_root} arch={arch} checkpoint={checkpoint}"
    )
    if arch not in _factories_by_arch:
        import_module(f"mentorpal.classifiers.arch.{arch}")
    checkpoint_fac = _factories_by_arch[arch]
    assert isinstance(checkpoint_fac, CheckpointClassifierFactory)
    c_path = find_checkpoint(checkpoint_root, arch=arch, checkpoint=checkpoint)
    return ClassifierFactory(checkpoint_fac, c_path)
