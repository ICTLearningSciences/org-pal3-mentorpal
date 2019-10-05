from pipeline.mentorpath import MentorPath
from pipeline.process import (
    sync_timestamps,
    update_transcripts,
    utterances_to_audio,
    utterances_to_training_data,
)
from pipeline.transcriptions import TranscriptionService


class Pipeline:

    mpath: MentorPath = None

    def __init__(self, mentor: str, mentor_data_path: str):
        self.mpath = MentorPath(mentor_id=mentor, root_path=mentor_data_path)

    def sync_timestamps(self):
        utterances_new = sync_timestamps(self.mpath)
        print(f"utterances={utterances_new.to_dict()}")

    def data_update(self):
        transcription_service = TranscriptionService()
        utterances_synced = sync_timestamps(self.mpath)
        utterances_to_audio(utterances_synced, self.mpath)
        utterances_updated = update_transcripts(
            utterances_synced, transcription_service, self.mpath
        )
        td_result = utterances_to_training_data(utterances_updated)
        self.mpath.write_questions_paraphrases_answers(
            td_result.questions_paraphrases_answers
        )
        self.mpath.write_prompts_utterances(td_result.prompts_utterances)
