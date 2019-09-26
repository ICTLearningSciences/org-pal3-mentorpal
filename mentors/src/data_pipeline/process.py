from mentorpath import MentorPath
from session import copy_sessions, Sessions

def sync_timestamps(
    mp: MentorPath, sessions_before: Sessions = None
) -> Sessions:
    sessions_result = copy_sessions(sessions_before) if sessions_before else Sessions()
    return sessions_result
    # glob_path = f"{ts_root}/*.csv"
    # qpa_rows = []
    # pu_rows = []
    # for t_path in mp.get_timestamps():
    #     try:
    #         with open(t_path, "r") as f:
    #             t = load(f, Loader=YamlLoader)
    #             transcription = t.get("transcription")
    #             assert transcription is not None, "item must have a transcription"
    #             utterance_type = UtteranceType.for_value(
    #                 t.get("type"), UtteranceType.ANSWER
    #             )
    #             if utterance_type == UtteranceType.ANSWER:
    #                 question = t.get("question")
    #                 assert question is not None, "item must have question text"
    #                 qpa_rows.append([None, None, mentor_id, question, transcription])
    #             else:
    #                 pu_rows.append([utterance_type.value, mentor_id, transcription])
    #     except BaseException as err:
    #         logging.warning(f"failed to load transcript data from {t_path}: {err}")
    
    # return result
