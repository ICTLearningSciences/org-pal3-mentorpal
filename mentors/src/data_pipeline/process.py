from datetime import time, timedelta
import logging
from typing import List

import pandas as pd

from mentorpath import MentorPath
from sessions import Sessions, SessionSlice
from transcription_type import TranscriptionType
from utterance_type import UtteranceType


def timestr_to_secs(s: str) -> time:
    h, m, s, hs = s.split(":")
    td = timedelta(hours=int(h), minutes=int(m), seconds=int(s))
    return float(td.seconds + float(hs) / 100)


def sync_timestamps(mp: MentorPath, sessions_before: Sessions = None) -> Sessions:
    sessions_result = Sessions(mentorId=mp.get_mentor_id())
    for ts in mp.find_timestamps():
        try:
            ts_data = pd.read_csv(ts.file_path).fillna("")
            ts_slices: List[SessionSlice] = []
            for i, row in ts_data.iterrows():
                try:
                    row_type = TranscriptionType(row["Answer/Utterance"])
                    question = row["Question"]
                    time_start = timestr_to_secs(row["Response start"])
                    time_end = timestr_to_secs(row["Response end"])
                    ss = SessionSlice(timeStart=time_start, timeEnd=time_end)
                    if row_type == TranscriptionType.ANSWER:
                        ss.utteranceType = UtteranceType.ANSWER
                        ss.question = question
                    else:
                        ss.utteranceType = UtteranceType.for_value(question)
                    ts_slices.append(ss)
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
