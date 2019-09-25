from dataclasses import asdict, dataclass, field
import logging
import os
from typing import Dict, List

import pandas as pd

import audioslicer
from training_data import PromptsUtterancesBuilder, QuestionsParaphrasesAnswersBuilder
from utterance_type import UtteranceType
from utils import yaml_load


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
    id: str = ""
    sourceAudio: str = ""

    def to_dict(self):
        return asdict(self)

    def audio_file_path_from(self, mentor_root: str) -> str:
        return os.path.join(mentor_root, self.sourceAudio) if self.sourceAudio else None


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
                res.append(
                    Utterance(
                        id=f"{part_id}{slce_id}",
                        sourceAudio=part.sourceAudio,
                        **slce.to_dict(),
                    )
                )
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


def sessions_to_training_data(sessions: Sessions) -> SessionsTrainingData:
    sessions_result = copy_sessions(sessions)
    qpa = QuestionsParaphrasesAnswersBuilder(mentor_id=sessions.mentorId)
    pu = PromptsUtterancesBuilder(mentor_id=sessions.mentorId)
    for u in sessions_result.utterances():
        if not (u.transcript and u.utteranceType):
            continue
        if u.utteranceType == UtteranceType.ANSWER:
            if not u.question:
                continue
            qpa.add_row(question=u.question, answer=u.transcript)
        else:
            pu.add_row(situation=u.utteranceType.value, utterance=u.transcript)
    return SessionsTrainingData(
        sessions=sessions_result,
        questions_paraphrases_answers=qpa.to_data_frame(),
        prompts_utterances=pu.to_data_frame(),
    )


def sessions_from_yaml(sessions_yaml: str) -> Sessions:
    d = yaml_load(sessions_yaml)
    return Sessions(**d)


def sessions_to_audioslices(
    sessions: Sessions, sessions_root: str, output_root: str
) -> None:
    """
    Give sessions data and a root sessions directory,
    slices up the source audio into one file per part in the data.

    For illustration, the source sessions_root might contain the following:

        <root>/session1/part1_audio.wav
        <root>/session1/part2_audio.wav
        <root>/session2/part1_audio.wav

    ...and depending on the contents of sessions data that might produce

        <output_root>/s001p001s00000413e00000805.wav
        <output_root>/s001p001s00001224e00001501.wav
        <output_root>/s001p002s00002701e00005907.wav
        <output_root>/s001p002s00011804e00013229.wav
        <output_root>/s002p001s00004213e00005410.wav
        <output_root>/s002p001s00010515e00012605.wav

    Where the final two numbers in each sliced wav file above are the time_start and time end,
    e.g. 00000413 = 00:00:04:13
    """
    abs_sessions_root = os.path.abspath(sessions_root)
    abs_output_root = os.path.abspath(output_root)
    for u in sessions.utterances():
        try:
            audio_source = u.audio_file_path_from(abs_sessions_root)
            if not audio_source:
                logging.warning(f"no audio source found for utterance {u.id}")
                continue
            if not os.path.isfile(audio_source):
                logging.warning(
                    f"audio source file not found for utterance {u.id} at path {audio_source}"
                )
                continue
            start = float(u.timeStart)
            if not (start == 0.0 or (start and start >= 0.0)):
                logging.warning(
                    f"invalid timeStart ({u.timeStart}) for utterance {u.id}"
                )
                continue
            end = float(u.timeEnd)
            if not (end and end > start):
                logging.warning(f"invalid timeEnd ({u.timeEnd}) for utterance {u.id}")
                continue
            target_path = os.path.join(abs_output_root, f"{u.id}.wav")
            audioslicer.slice_audio(audio_source, target_path, u.timeStart, u.timeEnd)
        except BaseException as u_err:
            logging.warning(f"exception processing utterance: {str(u_err)}")
