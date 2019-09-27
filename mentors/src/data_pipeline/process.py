from dataclasses import dataclass
from datetime import time, timedelta
import logging
import os
from typing import List

import pandas as pd

import audioslicer
from mentorpath import MentorPath
from training_data import QuestionsParaphrasesAnswersBuilder, PromptsUtterancesBuilder
from transcriptions import TranscriptionService
from transcription_type import TranscriptionType
from utterance_type import UtteranceType
from utterances import copy, Utterance, Utterances


def timestr_to_secs(s: str) -> float:
    h, m, s, hs = s.split(":")
    td = timedelta(hours=int(h), minutes=int(m), seconds=int(s))
    return float(td.seconds + float(hs) / 100)


def sync_timestamps(mp: MentorPath) -> Utterances:
    sessions_result = Utterances()
    for ts in mp.find_timestamps():
        try:
            ts_data = pd.read_csv(ts.file_path).fillna("")
            ts_rel_path = mp.to_relative_path(ts.file_path)
            ts_slices: List[Utterance] = []
            for i, row in ts_data.iterrows():
                try:
                    row_type = TranscriptionType(row["Answer/Utterance"])
                    question = row["Question"]
                    time_start = timestr_to_secs(row["Response start"])
                    time_end = timestr_to_secs(row["Response end"])
                    u = Utterance(
                        mentor=mp.get_mentor_id(),
                        part=ts.part,
                        session=ts.session,
                        sourceTimestamps=ts_rel_path,
                        timeStart=time_start,
                        timeEnd=time_end,
                    )
                    if row_type == TranscriptionType.ANSWER:
                        u.utteranceType = UtteranceType.ANSWER
                        u.question = question
                    else:
                        u.utteranceType = UtteranceType.for_value(question)
                    ts_slices.append(u)
                except BaseException as row_err:
                    logging.exception(
                        f"error processing row {i} of timestamps file {ts.file_path}: {str(row_err)}"
                    )
            sessions_result.apply_timestamps(
                ts.session, ts.part, mp.to_relative_path(ts.file_path), ts_slices
            )
        except BaseException as ts_err:
            logging.exception(
                f"error processing timestamps {ts.file_path}: {str(ts_err)}"
            )
    return sessions_result


def update_transcripts(
    utterances: Utterances,
    transcription_service: TranscriptionService,
    mp: MentorPath,
) -> None:
    """
    Give sessions data and a root sessions directory,
    transcribes the text for items in the sessions data,
    returning an updated copy of the sessions data with transcriptions populated.
    """
    audio_root = os.path.abspath(mp.get_audio_slices_path())
    result = copy(utterances)
    for u in utterances.utterances():
        if u.transcript:
            continue  # transcript already set
        audio_path = u.get_utterance_audio_path(audio_root)
        audio_path_rel = mp.to_relative_path(audio_path)
        if not os.path.isfile(audio_path):
            logging.warning(
                f"audio slice is missing for utternance {u.get_id()} at path {audio_path}"
            )
            continue
        try:
            text = transcription_service.transcribe(audio_path)
            result.set_transcript(u.get_id(), transcript=text, source_audio=audio_path_rel)
        except BaseException as err:
            logging.warning(
                f"failed to transcribe audio for id {u.get_id()} at path {audio_path}: {str(err)}"
            )
    return result


def utterances_to_audioslices(
    utterances: Utterances, sessions_root: str, output_root: str
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
    for u in utterances.utterances():
        try:
            audio_source = u.source_audio_file_path_from(abs_sessions_root)
            if not audio_source:
                logging.warning(f"no audio source found for utterance {u.get_id()}")
                continue
            if not os.path.isfile(audio_source):
                logging.warning(
                    f"audio source file not found for utterance {u.get_id()} at path {audio_source}"
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
            audioslicer.slice_audio(audio_source, target_path, u.timeStart, u.timeEnd)
        except BaseException as u_err:
            logging.warning(f"exception processing utterance: {str(u_err)}")


@dataclass
class Utterances2TrainingDataResult:
    utterances: Utterances = None
    questions_paraphrases_answers: pd.DataFrame = None
    prompts_utterances: pd.DataFrame = None

def utterances_to_training_data(utterances: Utterances) -> Utterances2TrainingDataResult:
    utterances_result = copy(utterances)
    qpa = QuestionsParaphrasesAnswersBuilder()
    pu = PromptsUtterancesBuilder()
    for u in utterances_result.utterances():
        if not (u.transcript and u.utteranceType):
            continue
        if u.utteranceType == UtteranceType.ANSWER:
            if not u.question:
                continue
            qpa.add_row(question=u.question, answer=u.transcript, mentor_id=u.mentor)
        else:
            pu.add_row(situation=u.utteranceType.value, utterance=u.transcript, mentor_id=u.mentor)
    return Utterances2TrainingDataResult(
        utterances=utterances_result,
        questions_paraphrases_answers=qpa.to_data_frame(),
        prompts_utterances=pu.to_data_frame(),
    )