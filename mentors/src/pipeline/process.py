from dataclasses import asdict, dataclass, field
from datetime import timedelta
from functools import reduce
import logging
import os
import re
import shutil
from typing import Callable, Dict, List

from ftfy import fix_text
import pandas as pd

from pipeline.captions import transcript_to_vtt
from pipeline import media_tools
from pipeline.mentorpath import MentorPath
from pipeline.paraphrases import ParaphrasesByQuestion
from pipeline.topics import TopicsByQuestion
from pipeline.training_data import (
    ClassifierDataBuilder,
    QuestionsParaphrasesAnswersBuilder,
    PromptsUtterancesBuilder,
    UtteranceDataBuilder,
)
from pipeline.transcriptions import TranscriptionService
from pipeline.utils import yaml_load
from pipeline.utterance_asset_type import (
    UtteranceAssetType,
    SESSION_TIMESTAMPS,
    UTTERANCE_AUDIO,
    UTTERANCE_VIDEO_MOBILE,
    UTTERANCE_VIDEO_WEB,
)
from pipeline.utterances import (
    copy_utterance,
    copy_utterances,
    TranscriptionType,
    Utterance,
    UtteranceMap,
    UtteranceType,
)


@dataclass
class _UtteranceSourceAndTarget:
    utterance: Utterance
    source: str
    target: str


def _prepare_videos(
    utterances: UtteranceMap,
    mp: MentorPath,
    video_type: UtteranceAssetType,
    encode_func: Callable[[str, str], None],
    logging_function_name: str,
) -> UtteranceMap:
    result_utterances = copy_utterances(utterances)
    ust_list: List[_UtteranceToAudio] = []
    for u in result_utterances.utterances():
        try:
            mp.find_and_assign_assets(u)
            source_path = mp.find_utterance_video(u, mp)
            if not source_path:
                logging.warning(f"no video source found for utterance {u}")
                continue
            target_path = mp.find_asset(
                u, asset_type=video_type, return_non_existing_paths=True
            )
            if os.path.isfile(target_path):
                continue
            ust_list.append(
                _UtteranceSourceAndTarget(
                    utterance=u, source=source_path, target=target_path
                )
            )
        except BaseException as u_err:
            logging.exception(
                f"{logging_function_name}: exception processing utterance: {u_err}"
            )
    for i, ust in enumerate(ust_list):
        try:
            logging.info(
                f"{logging_function_name} [{i + 1}/{len(ust_list)}] source={ust.source}, target={ust.target}"
            )
            os.makedirs(os.path.dirname(ust.target), exist_ok=True)
            encode_func(ust.source, ust.target)
        except BaseException as u_err:
            logging.exception(
                f"{logging_function_name}: exception processing utterance: {u_err}"
            )
    return result_utterances


def _timestr_to_secs(s: str) -> float:
    h, m, s, hs = s.split(":")
    td = timedelta(hours=int(h), minutes=int(m), seconds=int(s))
    return float(td.seconds + float(hs) / 100)


@dataclass
class SessionToAudio:
    sessionAudio: str = None
    sessionVideo: str = None
    utterances: List[Utterance] = field(default_factory=lambda: [])


@dataclass
class SessionToAudioResultSummary:
    succeededSessionAudioCount: int
    succeededUtteranceCount: int
    failedSessionAudioCount: int
    failedUtteranceCount: int

    def to_dict(self):
        return asdict(self)


def prepare_videos_mobile(utterances: UtteranceMap, mp: MentorPath) -> UtteranceMap:
    return _prepare_videos(
        utterances,
        mp,
        UTTERANCE_VIDEO_MOBILE,
        media_tools.video_encode_for_mobile,
        "prepare_videos_mobile",
    )


def prepare_videos_web(utterances: UtteranceMap, mp: MentorPath) -> UtteranceMap:
    return _prepare_videos(
        utterances,
        mp,
        UTTERANCE_VIDEO_WEB,
        shutil.copyfile,  # for now just copying files for web
        "prepare_videos_web",
    )


def session_to_audio_result_summary_from_yaml(
    yaml_path: str
) -> SessionToAudioResultSummary:
    d = yaml_load(yaml_path)
    return SessionToAudioResultSummary(**d)


@dataclass
class SessionToAudioResult:
    utterances: UtteranceMap
    succeeded: List[SessionToAudio] = field(default_factory=lambda: [])
    failed: List[SessionToAudio] = field(default_factory=lambda: [])

    def summary(self):
        return SessionToAudioResultSummary(
            succeededSessionAudioCount=len(self.succeeded),
            failedSessionAudioCount=len(self.failed),
            succeededUtteranceCount=reduce(
                lambda t, c: t + len(c.utterances), self.succeeded, 0
            ),
            failedUtteranceCount=reduce(
                lambda t, c: t + len(c.utterances), self.failed, 0
            ),
        )


def sessions_to_audio(utterances: UtteranceMap, mp: MentorPath) -> SessionToAudioResult:
    """
    Give sessions data and a root sessions directory,
    make sure all that sessionAudio is generated (from video)
    and assigned to each utterance
    """
    result = SessionToAudioResult(utterances=copy_utterances(utterances))
    s2a_by_session_audio_path: Dict[str, SessionToAudio] = dict()
    # probably this could be accumulate but seems like code would be less readable?
    for u in result.utterances.utterances():
        mp.find_and_assign_assets(u)
        session_audio = mp.find_session_audio(u, return_non_existing_paths=True)
        if os.path.isfile(session_audio):
            continue  # no need to process already existing session audio
        if session_audio not in s2a_by_session_audio_path:
            s2a_by_session_audio_path[session_audio] = SessionToAudio(
                sessionAudio=session_audio
            )
        s2a = s2a_by_session_audio_path[session_audio]
        s2a.utterances.append(u)
        s2a.sessionVideo = (
            mp.find_session_video(u) if not s2a.sessionVideo else s2a.sessionVideo
        )
    for i, s2a in enumerate(s2a_by_session_audio_path.values()):
        try:
            if not s2a.sessionVideo:
                continue
            logging.info(
                f"sessions_to_audio [{i + 1}/{len(s2a_by_session_audio_path)}] video={s2a.sessionVideo}, audio={s2a.sessionAudio}"
            )
            media_tools.video_to_audio(s2a.sessionVideo, s2a.sessionAudio)
            for u in s2a.utterances:
                mp.find_and_assign_assets(u)
            result.succeeded.append(s2a)  # pylint: disable=E1101
        except BaseException as u_err:
            logging.exception(f"exception processing utterance: {u_err}")
            result.failed.append(s2a)  # pylint: disable=E1101
    return result


def sync_timestamps(mp: MentorPath) -> UtteranceMap:
    utterances_current = mp.load_utterances(create_new=True)
    utterances_merged = UtteranceMap()
    for ts in mp.find_timestamps():
        try:
            ts_data = pd.read_csv(ts.file_path).fillna("")
            ts_rel_path = mp.to_relative_path(
                ts.file_path, SESSION_TIMESTAMPS.get_mentor_asset_root()
            )
            ts_slices: List[Utterance] = []
            for i, row in ts_data.iterrows():
                try:
                    row_type = row["Answer/Utterance"]
                    question = fix_text(row["Question"])
                    time_start = _timestr_to_secs(row["Response start"])
                    time_end = _timestr_to_secs(row["Response end"])
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
                ts.session,
                ts.part,
                mp.to_relative_path(
                    ts.file_path, SESSION_TIMESTAMPS.get_mentor_asset_root()
                ),
                ts_slices,
            )
        except BaseException as ts_err:
            logging.exception(f"error processing timestamps {ts.file_path}: {ts_err}")
    return utterances_merged


def update_paraphrases(
    utterances: UtteranceMap, paraphrases: ParaphrasesByQuestion
) -> UtteranceMap:
    """
    Applies a map of questions to topics to the a mentor's utterances
    """
    result = copy_utterances(utterances)
    for u in result.utterances():
        u.paraphrases = (
            sorted(paraphrases.find_paraphrases(u.question)) if u.question else []
        )
    return result


def update_topics(utterances: UtteranceMap, topics: TopicsByQuestion) -> UtteranceMap:
    """
    Applies a map of questions to topics to the a mentor's utterances
    """
    result = copy_utterances(utterances)
    for u in result.utterances():
        u.topics = sorted(topics.find_topics(u.question)) if u.question else []
    return result


@dataclass
class _UtteranceTranscriptionCall:
    utterance: Utterance
    audio_path: str


def update_transcripts(
    utterances: UtteranceMap,
    transcription_service: TranscriptionService,
    mp: MentorPath,
    strip_non_verbal_tokens: bool = True,
) -> UtteranceMap:
    """
    Give sessions data and a root sessions directory,
    transcribes the text for items in the sessions data,
    returning an updated copy of the sessions data with transcriptions populated.
    """
    result = copy_utterances(utterances)
    call_list: List[_UtteranceTranscriptionCall] = []
    for u in result.utterances():
        if u.transcript or u.is_no_transcription_type():
            continue  # transcript already set
        audio_path = mp.find_utterance_audio(u)
        if not audio_path:
            logging.warning(f"utterance has no audio {u.get_id()}")
            continue
        call_list.append(
            _UtteranceTranscriptionCall(utterance=u, audio_path=audio_path)
        )
    for i, call in enumerate(call_list):
        try:
            logging.info(
                f"transcribe [{i + 1}/{len(call_list)}] audio={call.audio_path}"
            )
            text = transcription_service.transcribe(call.audio_path)
            if strip_non_verbal_tokens:
                text = re.sub(r"%[a-zA-Z0-9_\-]+[\s]?", "", text)
            audio_path_rel = mp.to_relative_path(
                call.audio_path, UTTERANCE_AUDIO.get_mentor_asset_root()
            )
            result.set_transcript(
                call.utterance.get_id(), transcript=text, source_audio=audio_path_rel
            )
        except BaseException as err:
            logging.warning(
                f"failed to transcribe audio for id {u.get_id()} at path {audio_path}: {err}"
            )
    return result


@dataclass
class _UtteranceToAudio:
    utterance: Utterance
    audio_source: str
    audio_target: str


def utterances_slice_audio(utterances: UtteranceMap, mp: MentorPath) -> UtteranceMap:
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
    u2a_list: List[_UtteranceToAudio] = []
    for u in result_utterances.utterances():
        try:
            mp.find_and_assign_assets(u)
            if u.is_no_transcription_type():
                continue
            session_audio = mp.find_session_audio(u, mp)
            if not session_audio:
                logging.warning(f"no audio source found for utterance {u}")
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
            utterance_audio_path = mp.find_utterance_audio(
                u, return_non_existing_paths=True
            )
            mp.set_utterance_audio_path(u, utterance_audio_path)
            if os.path.isfile(utterance_audio_path):
                continue
            u2a_list.append(
                _UtteranceToAudio(
                    utterance=u,
                    audio_source=session_audio,
                    audio_target=utterance_audio_path,
                )
            )
        except BaseException as u_err:
            logging.exception(f"exception processing utterance: {u_err}")
    for i, u2a in enumerate(u2a_list):
        try:
            logging.info(
                f"utterance_to_audio [{i + 1}/{len(u2a_list)}] source={u2a.audio_source}, target={u2a.audio_target}, time-start={u2a.utterance.timeStart}, time-end={u2a.utterance.timeEnd}"
            )
            media_tools.slice_audio(
                u2a.audio_source,
                u2a.audio_target,
                u2a.utterance.timeStart,
                u2a.utterance.timeEnd,
            )
        except BaseException as u_err:
            logging.exception(f"exception processing utterance: {u_err}")
    return result_utterances


@dataclass
class _UtteranceToVideo:
    utterance: Utterance
    video_source: str
    video_target: str


def utterances_slice_video(utterances: UtteranceMap, mp: MentorPath) -> UtteranceMap:
    result_utterances = copy_utterances(utterances)
    u2v_list: List[_UtteranceToVideo] = []
    for u in result_utterances.utterances():
        try:
            mp.find_and_assign_assets(u)
            session_video = mp.find_session_video(u, mp)
            if not session_video:
                logging.warning(f"no video source found for utterance {u}")
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
            utterance_video_path = mp.find_utterance_video(
                u, return_non_existing_paths=True
            )
            mp.set_utterance_video_path(u, utterance_video_path)
            if os.path.isfile(utterance_video_path):
                continue
            u2v_list.append(
                _UtteranceToVideo(
                    utterance=u,
                    video_source=session_video,
                    video_target=utterance_video_path,
                )
            )
        except BaseException as u_err:
            logging.exception(f"exception processing utterance: {u_err}")
    for i, u2v in enumerate(u2v_list):
        try:
            logging.info(
                f"utterance_to_video [{i + 1}/{len(u2v_list)}] source={u2v.video_source}, target={u2v.video_target}, time-start={u2v.utterance.timeStart}, time-end={u2v.utterance.timeEnd}"
            )
            media_tools.slice_video(
                u2v.video_source,
                u2v.video_target,
                u2v.utterance.timeStart,
                u2v.utterance.timeEnd,
            )
        except BaseException as u_err:
            logging.exception(f"exception processing utterance: {u_err}")
    return result_utterances


@dataclass
class Utterances2CaptionsResult:
    utterances: UtteranceMap = None
    captions_by_utterance_id: Dict[str, str] = None


def utterances_to_captions(
    utterances: UtteranceMap, mp: MentorPath
) -> Utterances2CaptionsResult:
    """
    Given Utterances generates a result where each key is an utterance id
    and the value is the captions string.
    Also writes the captions to the default target location as .vtt files.
    """
    captions_by_utterance_id = {}
    for u in utterances.utterances():
        try:
            if u.is_no_transcription_type():
                continue
            if not u.transcript:
                logging.warning(
                    f"utterances_to_captions utterance {u.get_id()} has no transcript"
                )
                continue
            duration = u.get_duration()
            if not duration > 0:
                logging.warning(
                    f"utterances_to_captions utterance {u.get_id()} has no duration"
                )
                continue
            vtt_content = transcript_to_vtt(u.transcript, duration)
            vtt_path = mp.find_utterance_captions(u, return_non_existing_paths=True)
            os.makedirs(os.path.dirname(vtt_path), exist_ok=True)
            with open(vtt_path, "w") as f:
                f.write(vtt_content)
            captions_by_utterance_id[u.get_id()] = vtt_content
        except Exception as u_err:
            logging.warning(
                f"failed to generated captions for utterance {u.get_id()}: {u_err}"
            )
    return Utterances2CaptionsResult(
        captions_by_utterance_id=captions_by_utterance_id, utterances=utterances
    )


@dataclass
class Utterances2TrainingDataResult:
    utterances: UtteranceMap = None
    classifier_data: pd.DataFrame = None
    questions_paraphrases_answers: pd.DataFrame = None
    prompts_utterances: pd.DataFrame = None
    utterance_data: pd.DataFrame = None


def utterances_to_training_data(
    utterances: UtteranceMap
) -> Utterances2TrainingDataResult:
    utterances_merged = copy_utterances(utterances)
    qpa = QuestionsParaphrasesAnswersBuilder()
    pu = PromptsUtterancesBuilder()
    cd = ClassifierDataBuilder()
    ud = UtteranceDataBuilder()
    for u in utterances_merged.utterances():
        if u.utteranceType == UtteranceType.IDLE:
            ud.add_row(id=u.get_id(), utterance="", situation=u.utteranceType)
            continue
        if not (u.transcript and u.utteranceType):
            continue
        if u.utteranceType == UtteranceType.ANSWER:
            if not u.question:
                continue
            qpa.add_row(question=u.question, answer=u.transcript, mentor_id=u.mentor)
            cd.add_row(
                id=u.get_id(),
                topics=u.topics,
                text=u.transcript,
                question=u.question,
                paraphrases=u.paraphrases,
            )
        else:
            pu.add_row(
                situation=u.utteranceType, utterance=u.transcript, mentor_id=u.mentor
            )
            ud.add_row(id=u.get_id(), utterance=u.transcript, situation=u.utteranceType)
    return Utterances2TrainingDataResult(
        utterances=utterances_merged,
        classifier_data=cd.to_data_frame(),
        questions_paraphrases_answers=qpa.to_data_frame(),
        prompts_utterances=pu.to_data_frame(),
        utterance_data=ud.to_data_frame(),
    )
