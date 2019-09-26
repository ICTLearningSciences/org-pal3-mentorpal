from dataclasses import dataclass
from glob import glob
import os
from typing import List

from sessions import Sessions, sessions_from_yaml


@dataclass
class MentorPath:
    mentor_id: str
    root_path: str

    def _path_from(self, root: str, p: str = None) -> str:
        return os.path.join(root, p) if p else root

    def get_audio_slices_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_build_path(), "audioslices"), p)

    def get_recordings_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_build_path(), "recordings"), p)

    def get_timestamps(self) -> List[str]:
        return sorted(
            glob(os.path.join(self.get_recordings_path(), "*_timestamps.csv"))
        )

    def get_build_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_mentor_path(), "build"), p)

    def get_mentor_id(self) -> str:
        return self.mentor_id

    def get_mentor_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.root_path, self.get_mentor_id()), p)

    def get_sessions_data_path(self) -> str:
        return os.path.join(self.get_mentor_path(), ".mentor", "sessions.yaml")

    def load_sessions(self) -> Sessions:
        return sessions_from_yaml(self.get_sessions_data_path())
