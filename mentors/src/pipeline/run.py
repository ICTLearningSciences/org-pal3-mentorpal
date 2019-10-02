from pipeline.mentorpath import MentorPath
from pipeline.process import sync_timestamps


class Pipeline:

    mpath: MentorPath = None

    def __init__(self, mentor: str, mentor_data_path: str):
        self.mpath = MentorPath(mentor_id=mentor, root_path=mentor_data_path)

    def sync_timestamps(self):
        # utterances_cur = self.mpath.load_utterances()
        utterances_new = sync_timestamps(self.mpath)
        print(f"utterances={utterances_new.to_dict()}")
