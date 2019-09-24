from dataclasses import asdict, dataclass, field
from typing import Dict, List

import pandas as pd

from utterance_type import UtteranceType
from utils import yaml_load


COLS_QUESTIONS_PARAPHRASES_ANSWERS: List[str] = [
    "Topics",
    "Helpers",
    "Mentor",
    "Question",
    "text",
]
COLS_PROMPTS_UTTERANCES: List[str] = ["Situation", "Mentor", "Utterance/Prompt"]


@dataclass
class SessionSlice:
    errorMessage: str = None
    question: str = None
    timeEnd: float = -1.0
    timeStart: float = -1.0
    transcript: str = None
    utteranceType: UtteranceType = None

    def __post_init__(self):
        if isinstance(self.utteranceType, str):
            self.utteranceType = UtteranceType.for_value(self.utteranceType)

    def to_dict(self):
        return asdict(self)


@dataclass
class Utterance(SessionSlice):
    id: str = None

    def to_dict(self):
        return asdict(self)


@dataclass
class SessionPart:
    sourceAudio: str = None
    sourceTimestamps: str = None
    sourceVideo: str = None
    slicesById: Dict[str, SessionSlice] = field(default_factory=lambda: {})

    def __post_init__(self):
        self.slicesById = {k: SessionSlice(**v) for (k, v) in self.slicesById.items()}

    def to_dict(self):
        return asdict(self)


@dataclass
class Sessions:
    mentorId: str = None
    sessionsPartsById: Dict[str, SessionPart] = field(default_factory=lambda: {})

    def __post_init__(self):
        self.sessionsPartsById = {
            k: SessionPart(**v) for (k, v) in self.sessionsPartsById.items()
        }

    def utterances(self) -> List[Utterance]:
        res: List[Utterance] = []
        for part_id, part in self.sessionsPartsById.items():
            for slce_id, slce in part.slicesById.items():
                res.append(Utterance(id=f"{part_id}{slce_id}", **slce.to_dict()))
        return sorted(res, key=lambda x: x.id)

    def to_dict(self):
        return asdict(self)


def copy_sessions(sessions: Sessions) -> Sessions:
    return Sessions(**sessions.to_dict())


@dataclass
class SessionsTrainingData:
    sessions: Sessions = None
    questions_paraphrases_answers: pd.DataFrame = None
    prompts_utterances: pd.DataFrame = None


def sessions_to_training_data(sessions: Sessions,) -> SessionsTrainingData:
    sessions_result = copy_sessions(sessions)
    qpa_rows = []
    pu_rows = []
    for u in sessions_result.utterances():
        if not (u.transcript and u.utteranceType):
            continue
        if u.utteranceType == UtteranceType.ANSWER:
            if not u.question:
                continue
            qpa_rows.append(["", "", sessions.mentorId, u.question, u.transcript])
        else:
            pu_rows.append([u.utteranceType.value, sessions.mentorId, u.transcript])
    return SessionsTrainingData(
        sessions=sessions_result,
        questions_paraphrases_answers=pd.DataFrame(
            qpa_rows, columns=COLS_QUESTIONS_PARAPHRASES_ANSWERS
        ),
        prompts_utterances=pd.DataFrame(pu_rows, columns=COLS_PROMPTS_UTTERANCES),
    )


def sessions_from_yaml(sessions_yaml: str) -> Sessions:
    d = yaml_load(sessions_yaml)
    return Sessions(**d)
