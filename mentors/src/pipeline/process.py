from dataclasses import dataclass
from datetime import timedelta
import logging
import os
from typing import List

from ftfy import fix_text
import pandas as pd

from pipeline import media_tools
from pipeline.mentorpath import MentorPath
from pipeline.training_data import (
    QuestionsParaphrasesAnswersBuilder,
    PromptsUtterancesBuilder,
)
from pipeline.transcriptions import TranscriptionService
from pipeline.utterances import (
    copy_utterance,
    copy_utterances,
    TranscriptionType,
    Utterance,
    UtteranceMap,
    UtteranceType,
)


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
                    row_type = row["Answer/Utterance"]
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
                    mp.find_and_assign_assets(u)
                    if row_type == TranscriptionType.ANSWER:
                        u.utteranceType = UtteranceType.ANSWER
                        u.question = question
                    else:
                        u.utteranceType = question or UtteranceType.PROMPT
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
        audio_path = mp.find_utterance_audio(u)
        if not audio_path:
            logging.warning(f"utterance has no audio {u.get_id()}")
            continue
        try:
            text = transcription_service.transcribe(audio_path)
            audio_path_rel = mp.to_relative_path(audio_path)
            result.set_transcript(
                u.get_id(), transcript=text, source_audio=audio_path_rel
            )
        except BaseException as err:
            logging.warning(
                f"failed to transcribe audio for id {u.get_id()} at path {audio_path}: {err}"
            )
    return result


def _generate_session_audio(utterance: Utterance, mp: MentorPath) -> str:
    session_video = mp.find_session_video(utterance)
    if not session_video:
        return None
    session_audio = mp.find_session_audio(utterance, return_non_existing_paths=True)
    if not session_audio:
        return None
    media_tools.video_to_audio(session_video, session_audio)
    return session_audio


def _find_or_generate_session_audio(utterance: Utterance, mp: MentorPath) -> str:
    session_audio = mp.find_session_audio(utterance)
    if session_audio:
        return session_audio
    return _generate_session_audio(utterance, mp)


def utterances_to_audio(utterances: UtteranceMap, mp: MentorPath) -> None:
    """
    Give sessions data and a root sessions directory,
    slices up the source audio into one file per part in the data.

    For illustration, the source sessions_root might contain the following:

        <root>/session1/part1_audio.mp3
        <root>/session1/part2_audio.mp3
        <root>/session2/part1_audio.mp3

    ...and depending on the contents of sessions data that might produce

        <mentor_path>/utterance_audio/s001p001s00000413e00000805.mp3
        <mentor_path>/utterance_audio/s001p001s00001224e00001501.mp3
        <mentor_path>/utterance_audio/s001p002s00002701e00005907.mp3
        <mentor_path>/utterance_audio/s001p002s00011804e00013229.mp3
        <mentor_path>/utterance_audio/s002p001s00004213e00005410.mp3
        <mentor_path>/utterance_audio/s002p001s00010515e00012605.mp3

    Where the final two numbers in each sliced wav file above are the time_start and time end,
    e.g. e00000413 = (end-time) 00:00:04:13
    """
    result_utterances = copy_utterances(utterances)
    for u in result_utterances.utterances():
        try:
            mp.find_and_assign_assets(u)
            session_audio = _find_or_generate_session_audio(u, mp)
            if not session_audio:
                logging.warning(f"no audio source found for utterance {u}")
                continue
            if not os.path.isfile(session_audio):
                logging.warning(
                    f"audio source file not found at path {session_audio} for utterance {u} "
                )
                continue
            mp.find_and_assign_assets(
                u
            )  # this second call catches newly generated session audio
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
            utterance_audio_path = mp.find_utterance_audio(
                u, return_non_existing_paths=True
            )
            mp.set_utterance_audio_path(u, utterance_audio_path)
            if os.path.isfile(utterance_audio_path):
                continue
            media_tools.slice_audio(
                session_audio, utterance_audio_path, u.timeStart, u.timeEnd
            )
        except BaseException as u_err:
            logging.exception(f"exception processing utterance: {u_err}")
    return result_utterances


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
                situation=u.utteranceType, utterance=u.transcript, mentor_id=u.mentor
            )
    return Utterances2TrainingDataResult(
        utterances=utterances_merged,
        questions_paraphrases_answers=qpa.to_data_frame(),
        prompts_utterances=pu.to_data_frame(),
    )
