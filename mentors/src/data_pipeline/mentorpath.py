import os
from dataclasses import dataclass


@dataclass
class MentorPath:
    mentor_id: str
    root_path: str

    def get_audio_slices_root(self):
        return os.path.join(self.get_build_root(), "audioslices")

    def get_build_root(self):
        return os.path.join(self.get_mentor_root(), "build")

    def get_mentor_id(self):
        return self.mentor_id

    def get_mentor_root(self):
        return os.path.join(self.root_path, self.get_mentor_id())
