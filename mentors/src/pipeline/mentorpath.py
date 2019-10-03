from dataclasses import dataclass
from glob import glob
import os
from typing import Dict, List

import pandas as pd

from pipeline.training_data import (
    load_prompts_utterances as _load_prompts_utterances,
    load_questions_paraphrases_answers as _load_questions_paraphrases_answers,
    write_questions_paraphrases_answers as _write_questions_paraphrases_answers,
)
from pipeline.utterances import Utterance, UtteranceMap, utterances_from_yaml


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

    def get_utterance_audio_path(
        self, utterance: Utterance = None, subpath: str = None
    ) -> str:
        if utterance:
            return (
                self.get_mentor_path(utterance.utteranceAudio)
                if utterance.utteranceAudio
                else self.get_utterance_audio_path(subpath=f"{utterance.get_id()}.wav")
            )
        else:
            return self._path_from(
                os.path.join(self.get_build_path(), "utterance_audio"), subpath
            )

    def get_session_audio_path(
        self, utterance: Utterance = None, subpath: str = None
    ) -> str:
        if utterance:
            return (
                self.get_mentor_path(utterance.sessionAudio)
                if utterance.sessionAudio
                else self.get_session_audio_path(
                    subpath=os.path.join(
                        f"session{utterance.session}", f"part{utterance.part}_audio.wav"
                    )
                )
            )
        else:
            return self.get_recordings_path(subpath)

    def get_recordings_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_build_path(), "recordings"), p)

    def get_build_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_mentor_path(), "build"), p)

    def get_mentor_id(self) -> str:
        return self.mentor_id

    def get_mentor_data(self, p: str = None) -> str:
        return self.get_mentor_path(p)

    def get_mentor_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.root_path, self.get_mentor_id()), p)

    def get_questions_paraphrases_answers(self) -> str:
        return self.get_mentor_data("questions_paraphrases_answers.csv")

    def get_prompts_utterances(self) -> str:
        return self.get_mentor_data("prompts_utterances.csv")

    def get_sessions_data_path(self) -> str:
        return os.path.join(self.get_mentor_path(), ".mentor", "sessions.yaml")

    def get_utterances_data_path(self) -> str:
        return os.path.join(self.get_mentor_path(), ".mentor", "utterances.yaml")

    def find_timestamps(self) -> List[SessionPartFile]:
        return self._find_session_part_files(
            os.path.join(self.get_recordings_path(), "**/*.csv")
        )

    def load_utterances(self, create_new=False) -> UtteranceMap:
        data_path = self.get_utterances_data_path()
        if not os.path.isfile(data_path):
            return UtteranceMap() if create_new else None
        return utterances_from_yaml(data_path)

    def load_questions_paraphrases_answers(self) -> pd.DataFrame:
        return _load_questions_paraphrases_answers(
            self.get_questions_paraphrases_answers()
        )

    def load_prompts_utterances(self) -> pd.DataFrame:
        return _load_prompts_utterances(self.get_prompts_utterances())

    def write_questions_paraphrases_answers(self, d: pd.DataFrame) -> None:
        _write_questions_paraphrases_answers(
            d, self.get_questions_paraphrases_answers()
        )
