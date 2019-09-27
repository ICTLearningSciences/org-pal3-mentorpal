from dataclasses import asdict, dataclass, field
import logging
import math
import os
from typing import Dict, List

import pandas as pd

import audioslicer
from utterance_type import UtteranceType
from transcriptions import TranscriptionService
from utils import yaml_load


# def _utterance_id(part_id: str, slice_id: str) -> str:
#     return f"{part_id}{slice_id}"


# def _part_id(session: int, part: int) -> str:
#     return f"s{session:03}p{part:03}"


def _to_slice_timestr(secs_total: float) -> str:
    m, s = divmod(secs_total, 60)
    h, m = divmod(m, 60)
    hs = int(round(secs_total - math.floor(secs_total), 2) * 100)
    return f"{int(h):02}{int(m):02}{int(s):02}{hs:02}"

def _utterance_id(session: int, part: int, time_start: float, time_end: float) -> str:
    return f"s{session:03}p{part:03}s{_to_slice_timestr(time_start)}e{_to_slice_timestr(time_end)}"


# def _slice_id(time_start: float, time_end: float) -> str:
#     return f"s{_to_slice_timestr(time_start)}e{_to_slice_timestr(time_end)}"


# @dataclass
# class SessionSlice:
#     errorMessage: str = None
#     question: str = None
#     timeEnd: float = -1.0
#     timeStart: float = -1.0
#     transcript: str = None
#     utteranceAudio: str = None
#     utteranceType: UtteranceType = None

#     def __post_init__(self):
#         if isinstance(self.utteranceType, str):
#             self.utteranceType = UtteranceType.for_value(self.utteranceType)

#     def to_dict(self):
#         return asdict(self)


@dataclass
class Utterance:
    errorMessage: str = None
    mentor: str = None
    question: str = None
    part: int = 1
    session: int = 1
    sourceAudio: str = None
    sourceTimestamps: str = None
    sourceVideo: str = None
    timeEnd: float = -1.0
    timeStart: float = -1.0
    transcript: str = None
    utteranceAudio: str = None
    utteranceType: UtteranceType = None

    def __post_init__(self):
        if isinstance(self.utteranceType, str):
            self.utteranceType = UtteranceType.for_value(self.utteranceType)

    def get_id(self):
        return _utterance_id(self.session, self.part, self.timeStart, self.timeEnd)

    def source_audio_file_path_from(self, mentor_root: str) -> str:
        return os.path.join(mentor_root, self.sourceAudio) if self.sourceAudio else None

    def get_utterance_audio_path(self, sessions_root: str) -> str:
        rel_path = self.utteranceAudio or f"{self.get_id()}.wav"
        return os.path.join(sessions_root, rel_path) if sessions_root else rel_path

    def to_dict(self):
        return asdict(self)


# @dataclass
# class SessionPart:
#     sourceAudio: str = None
#     sourceTimestamps: str = None
#     sourceVideo: str = None
#     slicesById: Dict[str, SessionSlice] = field(default_factory=lambda: {})

#     def __post_init__(self):
#         self.slicesById = {k: SessionSlice(**v) for (k, v) in self.slicesById.items()}

#     # def find_utterance(
#     #     self, part_id:str, time_start:float, time_end:float) -> UtteranceType:
#     #     return None

#     def set_session_slice(self, ss: SessionSlice) -> None:
#         slice_id = _slice_id(ss.timeStart, ss.timeEnd)
#         self.slicesById[slice_id] = ss

#     def to_dict(self):
#         return asdict(self)


@dataclass
class Utterances:
    utterancesById: Dict[str, Utterance] = field(default_factory=lambda: {})

    def __post_init__(self):
        self.utterancesById = {
            k: Utterance(**v) for (k, v) in self.utterancesById.items()
        }

    def apply_timestamps(
        self,
        session: int,
        part: int,
        sourceTimestamps: str,
        timestampRows: List[Utterance],
    ) -> None:
        for u in timestampRows:
            self.utterancesById[u.get_id()] = u

    # def find_utterance(
    #     self, session: int, part: int, time_start: float, time_end
    # ) -> Utterance:
    #     part_id = _part_id(session, part)
    #     return (
    #         self.sessionsPartsById[part_id].find_utterance(
    #             part_id, time_start, time_end
    #         )
    #         if part_id in self.sessionsPartsById
    #         else None
    #     )

    def set_transcript(self, uid: str, transcript: str, source_audio: str) -> bool:
        if uid not in self.utterancesById:
            return False
        u = self.utterancesById[uid]
        u.transcript = transcript
        u.sourceAudio = source_audio

    # def set_session_slice(self, session: int, part: int, ss: SessionSlice) -> None:
    #     part_id = _part_id(session, part)
    #     if part_id not in self.sessionsPartsById:
    #         self.sessionsPartsById[part_id] = SessionPart()
    #     sp: SessionPart = self.sessionsPartsById[part_id]
    #     sp.set_session_slice(ss)

    def to_dict(self):
        return asdict(self)

    def utterances(self) -> List[Utterance]:
        return sorted(self.utterancesById.values(), key=lambda u: (u.session, u.part, u.timeStart))


def copy(utterances: Utterances) -> Utterances:
    return Utterances(**utterances.to_dict())



# def sessions_to_training_data(sessions: Sessions) -> SessionsTrainingData:
#     sessions_result = copy_sessions(sessions)
#     qpa = QuestionsParaphrasesAnswersBuilder(mentor_id=sessions.mentorId)
#     pu = PromptsUtterancesBuilder(mentor_id=sessions.mentorId)
#     for u in sessions_result.utterances():
#         if not (u.transcript and u.utteranceType):
#             continue
#         if u.utteranceType == UtteranceType.ANSWER:
#             if not u.question:
#                 continue
#             qpa.add_row(question=u.question, answer=u.transcript)
#         else:
#             pu.add_row(situation=u.utteranceType.value, utterance=u.transcript)
#     return SessionsTrainingData(
#         sessions=sessions_result,
#         questions_paraphrases_answers=qpa.to_data_frame(),
#         prompts_utterances=pu.to_data_frame(),
#     )


def utterances_from_yaml(yml: str) -> Utterances:
    d = yaml_load(yml)
    return Utterances(**d)


# def sessions_to_audioslices(
#     sessions: Sessions, sessions_root: str, output_root: str
# ) -> None:
#     """
#     Give sessions data and a root sessions directory,
#     slices up the source audio into one file per part in the data.

#     For illustration, the source sessions_root might contain the following:

#         <root>/session1/part1_audio.wav
#         <root>/session1/part2_audio.wav
#         <root>/session2/part1_audio.wav

#     ...and depending on the contents of sessions data that might produce

#         <output_root>/s001p001s00000413e00000805.wav
#         <output_root>/s001p001s00001224e00001501.wav
#         <output_root>/s001p002s00002701e00005907.wav
#         <output_root>/s001p002s00011804e00013229.wav
#         <output_root>/s002p001s00004213e00005410.wav
#         <output_root>/s002p001s00010515e00012605.wav

#     Where the final two numbers in each sliced wav file above are the time_start and time end,
#     e.g. 00000413 = 00:00:04:13
#     """
#     abs_sessions_root = os.path.abspath(sessions_root)
#     abs_output_root = os.path.abspath(output_root)
#     for u in sessions.utterances():
#         try:
#             audio_source = u.source_audio_file_path_from(abs_sessions_root)
#             if not audio_source:
#                 logging.warning(f"no audio source found for utterance {u.get_id()}")
#                 continue
#             if not os.path.isfile(audio_source):
#                 logging.warning(
#                     f"audio source file not found for utterance {u.get_id()} at path {audio_source}"
#                 )
#                 continue
#             start = float(u.timeStart)
#             if not (start == 0.0 or (start and start >= 0.0)):
#                 logging.warning(
#                     f"invalid timeStart ({u.timeStart}) for utterance {u.get_id()}"
#                 )
#                 continue
#             end = float(u.timeEnd)
#             if not (end and end > start):
#                 logging.warning(
#                     f"invalid timeEnd ({u.timeEnd}) for utterance {u.get_id()}"
#                 )
#                 continue
#             target_path = os.path.join(abs_output_root, f"{u.get_id()}.wav")
#             audioslicer.slice_audio(audio_source, target_path, u.timeStart, u.timeEnd)
#         except BaseException as u_err:
#             logging.warning(f"exception processing utterance: {str(u_err)}")


# def update_transcripts(
#     sessions: Sessions,
#     transcription_service: TranscriptionService,
#     transcripts_root: str,
# ) -> None:
#     """
#     Give sessions data and a root sessions directory,
#     transcribes the text for items in the sessions data,
#     returning an updated copy of the sessions data with transcriptions populated.
#     """
#     abs_root = os.path.abspath(transcripts_root)
#     result = copy_sessions(sessions)
#     for u in sessions.utterances():
#         if u.transcript:
#             continue  # transcript already set
#         audio_path = u.get_utterance_audio_path(abs_root)
#         if not os.path.isfile(audio_path):
#             logging.warning(
#                 f"audio slice is missing for utternance {u.get_id()} at path {audio_path}"
#             )
#             continue
#         try:
#             text = transcription_service.transcribe(audio_path)
#             result.set_transcript(u.partId, u.sliceId, text)
#         except BaseException as err:
#             logging.warning(
#                 f"failed to transcribe audio for id {u.get_id()} at path {audio_path}: {str(err)}"
#             )
#     return result
