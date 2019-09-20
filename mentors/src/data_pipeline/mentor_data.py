import os


class MentorData:
    def __init__(self, mentor_id: str, root_path: str) -> None:
        self.mentor_id = mentor_id
        self.root_path = root_path

    def get_build_root(self):
        return os.path.join(self.root_path, "build")

    def get_mentor_id(self):
        return self.mentor_id

    def get_transcripts_root(self):
        return os.path.join(self.get_build_root(), "transcripts")
