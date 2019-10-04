from dataclasses import dataclass
from datetime import timedelta
import logging
import os
from typing import List

from ftfy import fix_text
import pandas as pd

import pipeline
from pipeline.mentorpath import MentorPath
from pipeline.training_data import (
    QuestionsParaphrasesAnswersBuilder,
    PromptsUtterancesBuilder,
)
from pipeline.transcriptions import TranscriptionService
from pipeline.transcription_type import TranscriptionType
from pipeline.utterance_type import UtteranceType
from pipeline.utterances import copy_utterance, copy_utterances, Utterance, UtteranceMap


def timestr_to_secs(s: str) -> float:
    h, m, s, hs = s.split(":")
    td = timedelta(hours=int(h), minutes=int(m), seconds=int(s))
    return float(td.seconds + float(hs) / 100)


def sync_timestamps(mp: MentorPath) -> UtteranceMap:
    utterances_current = mp.load_utterances(create_new=True)
    utterances_merged = UtteranceMap()
    for ts in mp.find_timestamps():
        try:
            ts_data = pd.read_csv(ts.file_path).fillna("")
            ts_rel_path = mp.to_relative_path(ts.file_path)
            ts_slices: List[Utterance] = []
            for i, row in ts_data.iterrows():
                try:
                    row_type = TranscriptionType(row["Answer/Utterance"])
                    question = fix_text(row["Question"])
                    time_start = timestr_to_secs(row["Response start"])
                    time_end = timestr_to_secs(row["Response end"])
                    u_existing = utterances_current.find_one(
                        ts.session, ts.part, time_start, time_end
                    )
                    u = (
                        copy_utterance(u_existing)
                        if u_existing
                        else Utterance(
                            part=ts.part,
                            session=ts.session,
                            timeStart=time_start,
                            timeEnd=time_end,
                        )
                    )
                    u.mentor = mp.get_mentor_id()
                    u.sessionTimestamps = ts_rel_path
                    if row_type == TranscriptionType.ANSWER:
                        u.utteranceType = UtteranceType.ANSWER
                        u.question = question
                    else:
                        u.utteranceType = UtteranceType.for_value(question)
                    ts_slices.append(u)
                except BaseException as row_err:
                    logging.exception(
                        f"error processing row {i} of timestamps file {ts.file_path}: {row_err}"
                    )
            utterances_merged.apply_timestamps(
                ts.session, ts.part, mp.to_relative_path(ts.file_path), ts_slices
            )
        except BaseException as ts_err:
            logging.exception(f"error processing timestamps {ts.file_path}: {ts_err}")
    return utterances_merged


def update_transcripts(
    utterances: UtteranceMap,
    transcription_service: TranscriptionService,
    mp: MentorPath,
) -> None:
    """
    Give sessions data and a root sessions directory,
    transcribes the text for items in the sessions data,
    returning an updated copy of the sessions data with transcriptions populated.
    """
    result = copy_utterances(utterances)
    for u in utterances.utterances():
        if u.transcript:
            continue  # transcript already set
        audio_path = mp.get_utterance_audio_path(u)
        audio_path_rel = mp.to_relative_path(audio_path)
        if not os.path.isfile(audio_path):
            logging.warning(
                f"audio file is missing for utterance {u.get_id()} at path {audio_path}"
            )
            continue
        try:
            text = transcription_service.transcribe(audio_path)
            result.set_transcript(
                u.get_id(), transcript=text, source_audio=audio_path_rel
            )
        except BaseException as err:
            logging.warning(
                f"failed to transcribe audio for id {u.get_id()} at path {audio_path}: {err}"
            )
    return result


def _generate_session_audio(utterance: Utterance, mp: MentorPath) -> str:
    session_video = mp.get_session_video_path(utterance)
    if not session_video:
        logging.warning(f"no session video for utterance {utterance}")
        return None
    session_audio = mp.get_session_audio_path(utterance)
    pipeline.media_tools.video_to_audio(session_video, session_audio)
    return session_audio


def _find_or_generate_session_audio(utterance: Utterance, mp: MentorPath) -> str:
    session_audio = mp.get_session_audio_path(utterance)
    if os.path.isfile(session_audio):
        return session_audio
    return _generate_session_audio(utterance, mp)


def utterances_to_audio(
    utterances: UtteranceMap, mp: MentorPath, output_root: str
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
    abs_output_root = os.path.abspath(output_root)
    for u in utterances.utterances():
        try:
            session_audio = _find_or_generate_session_audio(u, mp)
            if not session_audio:
                logging.warning(f"no audio source found for utterance {u}")
                continue
            if not os.path.isfile(session_audio):
                logging.warning(
                    f"audio source file not found at path {session_audio} for utterance {u} "
                )
                continue
            start = float(u.timeStart)
            if not (start == 0.0 or (start and start >= 0.0)):
                logging.warning(
                    f"invalid timeStart ({u.timeStart}) for utterance {u.get_id()}"
                )
                continue
            end = float(u.timeEnd)
            if not (end and end > start):
                logging.warning(
                    f"invalid timeEnd ({u.timeEnd}) for utterance {u.get_id()}"
                )
                continue
            target_path = os.path.join(abs_output_root, f"{u.get_id()}.wav")
            if os.path.isfile(target_path):
                continue
            pipeline.media_tools.slice_audio(
                session_audio, target_path, u.timeStart, u.timeEnd
            )
        except BaseException as u_err:
            logging.exception(f"exception processing utterance: {u_err}")


@dataclass
class Utterances2TrainingDataResult:
    utterances: UtteranceMap = None
    questions_paraphrases_answers: pd.DataFrame = None
    prompts_utterances: pd.DataFrame = None


def utterances_to_training_data(
    utterances: UtteranceMap
) -> Utterances2TrainingDataResult:
    utterances_merged = copy_utterances(utterances)
    qpa = QuestionsParaphrasesAnswersBuilder()
    pu = PromptsUtterancesBuilder()
    for u in utterances_merged.utterances():
        if not (u.transcript and u.utteranceType):
            continue
        if u.utteranceType == UtteranceType.ANSWER:
            if not u.question:
                continue
            qpa.add_row(question=u.question, answer=u.transcript, mentor_id=u.mentor)
        else:
            pu.add_row(
                situation=u.utteranceType.value,
                utterance=u.transcript,
                mentor_id=u.mentor,
            )
    return Utterances2TrainingDataResult(
        utterances=utterances_merged,
        questions_paraphrases_answers=qpa.to_data_frame(),
        prompts_utterances=pu.to_data_frame(),
    )
