import logging

from pipeline.mentorpath import MentorPath
from pipeline.process import (
    sessions_to_audio,
    sync_timestamps,
    update_transcripts,
    utterances_to_audio,
    utterances_to_training_data,
)
import pipeline


class Pipeline:

    mpath: MentorPath = None

    def __init__(self, mentor: str, mentor_data_path: str):
        self.mpath = MentorPath(mentor_id=mentor, root_path=mentor_data_path)
        logging.getLogger().setLevel(logging.INFO)

    def sync_timestamps(self):
        utterances_new = sync_timestamps(self.mpath)
        print(f"utterances={utterances_new.to_dict()}")

    def data_update(self):
        transcription_service = pipeline.transcriptions.init_transcription_service()
        utterances_synced = sync_timestamps(self.mpath)
        utterances_w_session_audio = sessions_to_audio(utterances_synced, self.mpath)
        utterances_w_audio_src = utterances_to_audio(
            utterances_w_session_audio, self.mpath
        )
        utterances_w_transcripts = update_transcripts(
            utterances_w_audio_src, transcription_service, self.mpath
        )
        td_result = utterances_to_training_data(utterances_w_transcripts)
        self.mpath.write_questions_paraphrases_answers(
            td_result.questions_paraphrases_answers
        )
        self.mpath.write_prompts_utterances(td_result.prompts_utterances)
        self.mpath.write_utterances(td_result.utterances)
