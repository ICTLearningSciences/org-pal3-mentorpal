import logging

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
    skip_utterance_audio_file_exists_check: bool = False

    def __init__(
        self,
        mentor: str,
        mentor_data_path: str,
        skip_utterance_audio_file_exists_check: bool = False,
    ):
        self.mpath = MentorPath(mentor_id=mentor, root_path=mentor_data_path)
        self.skip_utterance_audio_file_exists_check = (
            skip_utterance_audio_file_exists_check
        )

    def sync_timestamps(self):
        utterances_new = sync_timestamps(self.mpath)
        print(f"utterances={utterances_new.to_dict()}")

    def data_update(self):
        transcription_service = TranscriptionService()
        utterances_synced = sync_timestamps(self.mpath)
        logging.warning(f"utterances_synced={utterances_synced}")
        utterances_to_audio(
            utterances_synced, self.mpath, self.mpath.get_utterance_audio_path()
        )
        utterances_updated = update_transcripts(
            utterances_synced,
            transcription_service,
            self.mpath,
            skip_audio_file_exists_check=self.skip_utterance_audio_file_exists_check,
        )
        logging.warning(f"utterances_updated={utterances_updated}")
        td_result = utterances_to_training_data(utterances_updated)
        self.mpath.write_questions_paraphrases_answers(
            td_result.questions_paraphrases_answers
        )
