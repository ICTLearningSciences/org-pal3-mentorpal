from dataclasses import dataclass
from glob import glob
import os
from typing import Dict, List

# from sessions import Sessions, sessions_from_yaml
from utterances import Utterances, utterances_from_yaml


@dataclass
class SessionPartFile:
    session: int
    part: int
    file_path: str


@dataclass
class MentorPath:
    mentor_id: str
    root_path: str

    def _path_from(self, root: str, p: str = None) -> str:
        return os.path.join(root, p) if p else root

    def _find_session_part_files(self, glob_path: str) -> List[SessionPartFile]:
        result: List[SessionPartFile] = []
        parts_by_session: Dict[str, List[str]] = {}
        for file_path in sorted(glob(glob_path), key=lambda f: f.lower()):
            path_root, p_part = os.path.split(file_path)
            _, s_part = os.path.split(path_root)
            if s_part not in parts_by_session:
                parts_by_session[s_part] = []
            s_parts_list = parts_by_session[s_part]
            if p_part not in s_parts_list:
                s_parts_list.append(p_part)
            result.append(
                SessionPartFile(
                    session=len(parts_by_session),
                    part=len(s_parts_list),
                    file_path=file_path,
                )
            )
        return result

    def to_relative_path(self, p: str) -> str:
        return os.path.relpath(p, self.get_mentor_path())

    def get_audio_slices_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_build_path(), "audioslices"), p)

    def get_recordings_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_build_path(), "recordings"), p)

    def get_build_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_mentor_path(), "build"), p)

    def get_mentor_id(self) -> str:
        return self.mentor_id

    def get_mentor_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.root_path, self.get_mentor_id()), p)

    def get_sessions_data_path(self) -> str:
        return os.path.join(self.get_mentor_path(), ".mentor", "sessions.yaml")

    def get_utterances_data_path(self) -> str:
        return os.path.join(self.get_mentor_path(), ".mentor", "utterances.yaml")

    def find_timestamps(self) -> List[SessionPartFile]:
        return self._find_session_part_files(
            os.path.join(self.get_recordings_path(), "**/*_timestamps.csv")
        )

    def load_utterances(self) -> Utterances:
        return utterances_from_yaml(self.get_utterances_data_path())
