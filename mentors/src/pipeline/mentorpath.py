from dataclasses import dataclass
from glob import glob
import os
import re
from typing import Dict, List

import pandas as pd

from pipeline.utterance_asset_type import (
    SESSION_AUDIO,
    SESSION_TIMESTAMPS,
    SESSION_VIDEO,
    UtteranceAssetType,
    UTTERANCE_AUDIO,
    UTTERANCE_VIDEO,
)
from pipeline.training_data import (
    load_prompts_utterances as _load_prompts_utterances,
    load_questions_paraphrases_answers as _load_questions_paraphrases_answers,
    write_prompts_utterances as _write_prompts_utterances,
    write_questions_paraphrases_answers as _write_questions_paraphrases_answers,
)
from pipeline.utterances import (
    Utterance,
    UtteranceMap,
    utterances_from_yaml,
    utterances_to_yaml,
)


@dataclass
class SessionPartFile:
    session: int
    part: int
    file_path: str


@dataclass
class MentorPath:
    mentor_id: str
    root_path: str

    def _find_existing_mentor_path_variation(self, base_path, *args) -> str:
        assert base_path
        for s, r in args:
            if not re.match(f".*{s}$", base_path):
                continue
            test_path = self.get_mentor_path(re.sub(f"{s}$", r, base_path))
            if os.path.isfile(test_path):
                return test_path
        return None

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

    def _mentor_path_isfile(self, p) -> bool:
        return os.path.isfile(self.get_mentor_path(p))

    def _path_from(self, root: str, p: str = None) -> str:
        return os.path.join(root, p) if p else root

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

    def find_and_assign_assets(self, utterance: Utterance) -> None:
        t = self.find_asset(utterance, SESSION_TIMESTAMPS)
        utterance.sessionTimestamps = (
            self.to_relative_path(t) if t else utterance.sessionTimestamps
        )
        v = self.find_asset(utterance, SESSION_VIDEO)
        utterance.sessionVideo = (
            self.to_relative_path(v) if v else utterance.sessionVideo
        )
        a = self.find_asset(utterance, SESSION_AUDIO)
        utterance.sessionAudio = (
            self.to_relative_path(a) if a else utterance.sessionAudio
        )
        return utterance

    def find_asset(
        self,
        utterance: Utterance,
        asset_type: UtteranceAssetType,
        return_non_existing_paths=False,
    ) -> str:
        configured_path = asset_type.get_utterance_val(utterance)
        if configured_path and (
            self._mentor_path_isfile(configured_path) or return_non_existing_paths
        ):
            return self.get_mentor_path(configured_path)
        inferred_path = asset_type.get_utterance_inferred_path(utterance)
        if inferred_path and (
            self._mentor_path_isfile(inferred_path) or return_non_existing_paths
        ):
            return self.get_mentor_path(inferred_path)
        return None

    def find_session_audio(
        self, utterance: Utterance, return_non_existing_paths=False
    ) -> str:
        return self.find_asset(
            utterance,
            SESSION_AUDIO,
            return_non_existing_paths=return_non_existing_paths,
        )

    def find_session_timestamps(
        self, utterance: Utterance = None, return_non_existing_paths=False
    ) -> str:
        return self.find_asset(
            utterance,
            SESSION_TIMESTAMPS,
            return_non_existing_paths=return_non_existing_paths,
        )

    def find_session_video(
        self, utterance: Utterance = None, return_non_existing_paths=False
    ) -> str:
        return self.find_asset(
            utterance,
            SESSION_VIDEO,
            return_non_existing_paths=return_non_existing_paths,
        )

    def find_timestamps(self) -> List[SessionPartFile]:
        return self._find_session_part_files(
            os.path.join(self.get_recordings_path(), "**/*.csv")
        )

    def find_utterance_audio(
        self, utterance: Utterance = None, return_non_existing_paths=False
    ) -> str:
        return self.find_asset(
            utterance,
            UTTERANCE_AUDIO,
            return_non_existing_paths=return_non_existing_paths,
        )

    def find_utterance_video(
        self, utterance: Utterance = None, return_non_existing_paths=False
    ) -> str:
        return self.find_asset(
            utterance,
            UTTERANCE_VIDEO,
            return_non_existing_paths=return_non_existing_paths,
        )

    def load_prompts_utterances(self) -> pd.DataFrame:
        return _load_prompts_utterances(self.get_prompts_utterances())

    def load_questions_paraphrases_answers(self) -> pd.DataFrame:
        return _load_questions_paraphrases_answers(
            self.get_questions_paraphrases_answers()
        )

    def load_utterances(self, create_new=False) -> UtteranceMap:
        data_path = self.get_utterances_data_path()
        if not os.path.isfile(data_path):
            return UtteranceMap() if create_new else None
        return utterances_from_yaml(data_path)

    def set_session_audio_path(
        self, utterance: Utterance, session_audio_path: str
    ) -> None:
        utterance.sessionAudio = self.to_relative_path(session_audio_path)

    def set_session_video_path(
        self, utterance: Utterance, session_video_path: str
    ) -> None:
        utterance.sessionVideo = self.to_relative_path(session_video_path)

    def set_utterance_audio_path(
        self, utterance: Utterance, utterance_audio_path: str
    ) -> None:
        utterance.utteranceAudio = self.to_relative_path(utterance_audio_path)

    def to_relative_path(self, p: str) -> str:
        return os.path.relpath(p, self.get_mentor_path())

    def write_prompts_utterances(self, d: pd.DataFrame) -> None:
        _write_prompts_utterances(d, self.get_prompts_utterances())

    def write_questions_paraphrases_answers(self, d: pd.DataFrame) -> None:
        _write_questions_paraphrases_answers(
            d, self.get_questions_paraphrases_answers()
        )

    def write_utterances(self, utterances: UtteranceMap) -> None:
        utterances_to_yaml(utterances, self.get_utterances_data_path())
