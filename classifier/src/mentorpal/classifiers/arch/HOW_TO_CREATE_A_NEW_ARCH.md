# How to Create a New Architecture for Mentor PAL

The app loads/discovers architectures using naming conventions. To create a new architecture, take a look at `mentorpal.classifiers.arch.lstm_v1.__init__.py` as an example, and make sure to follow the rules below.

## Module must reside in mentorpal.classifiers.arch.${CLASSIFIER_NAME}

The module must live in a folder matching the arch name that will be used in config, e.g. if the arch name is `lstm_v1` then the module needs to live in `mentorpal.classifiers.arch.lstm_v1`

## Module must register a CheckpointClassifierFactory for its arch name

This should happen in the module's `__init__.py`. You can see an example of this in `mentorpal.classifiers.arch.lstm_v1.__init__.py`. The relevant code are at the top, and look like this:

```python
from mentorpal.classifiers import CheckpointClassifierFactory, Classifier, register_classifier_factory


# store the CLASSIFIER_NAME because we use it several places
CLASSIFIER_NAME = "lstm_v1"

# CheckpointClassifierFactory impl that will get registered globally for this arch ('lstm_v1')
class _ClassifierFactory(CheckpointClassifierFactory):
    def create(self, checkpoint, mentors):
        return LSTMClassifier(mentors, checkpoint)


# NOTE: always make sure this module lives in `mentorpal.classifiers.arch.${CLASSIFIER_NAME}`
# so that it can be discovered/loaded by arch name
register_classifier_factory(CLASSIFIER_NAME, _ClassifierFactory())


# NOTE: classifiers MUST extend abstract base class `mentorpal.classifiers.Classifier`
class LSTMClassifier(Classifier):
```

TODO: anything we need to implement/document about training code?