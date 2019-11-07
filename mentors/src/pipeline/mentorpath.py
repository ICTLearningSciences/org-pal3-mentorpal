from dataclasses import dataclass
from glob import glob
import os
import re
from typing import Dict, List

import pandas as pd

from pipeline.utterance_asset_type import (
    MentorAssetRoot,
    SESSION_AUDIO,
    SESSION_TIMESTAMPS,
    SESSION_VIDEO,
    UtteranceAssetType,
    UTTERANCE_AUDIO,
    UTTERANCE_CAPTIONS,
    UTTERANCE_VIDEO,
    UTTERANCE_VIDEO_MOBILE,
    UTTERANCE_VIDEO_WEB,
)
from pipeline.paraphrases import (
    ParaphrasesByQuestion,
    load_paraphrases_by_question_from_csv as _load_paraphrases_by_question_from_csv,
)
from pipeline.topics import (
    TopicsByQuestion,
    load_topics_by_question_from_csv as _load_topics_by_question_from_csv,
)
from pipeline.training_data import (
    load_classifier_data as _load_training_classifier_data,
    load_prompts_utterances as _load_training_prompts_utterances,
    load_questions_paraphrases_answers as _load_training_questions_paraphrases_answers,
    load_utterance_data as _load_training_utterance_data,
    write_classifier_data as _write_training_classifier_data,
    write_prompts_utterances as _write_training_prompts_utterances,
    write_questions_paraphrases_answers as _write_training_questions_paraphrases_answers,
    write_utterance_data as _write_training_utterance_data,
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
    root_path_data_mentors: str
    root_path_video_mentors: str = None

    def __post_init__(self):
        if not self.root_path_video_mentors:
            root_path = os.path.dirname(os.path.dirname(self.root_path_data_mentors))
            self.root_path_video_mentors = os.path.join(root_path, "videos", "mentors")

    def _find_existing_mentor_path_variation(self, base_path, *args) -> str:
        assert base_path
        for s, r in args:
            if not re.match(f".*{s}$", base_path):
                continue
            test_path = self.get_mentor_data(re.sub(f"{s}$", r, base_path))
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

    def _mentor_asset_isfile(self, mentor_asset_root: MentorAssetRoot, p: str) -> bool:
        return os.path.isfile(self.get_mentor_asset(mentor_asset_root, p))

    def _path_from(self, root: str, p: str = None) -> str:
        return os.path.join(root, p) if p else root

    def get_recordings_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_build_path(), "recordings"), p)

    def get_build_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_mentor_data(), "build"), p)

    def get_data_path(self, p: str = None) -> str:
        return self._path_from(os.path.join(self.get_mentor_data(), "data"), p)

    def get_mentor_id(self) -> str:
        return self.mentor_id

    def get_mentor_asset(
        self, mentor_asset_root: MentorAssetRoot, p: str = None
    ) -> str:
        return (
            self.get_mentor_data(p)
            if mentor_asset_root == MentorAssetRoot.DATA
            else self.get_mentor_video(p)
        )

    def get_mentor_data(self, p: str = None) -> str:
        return self._path_from(
            os.path.join(self.root_path_data_mentors, self.get_mentor_id()), p
        )

    def get_mentor_video(self, p: str = None) -> str:
        return self._path_from(
            os.path.join(self.root_path_video_mentors, self.get_mentor_id()), p
        )

    def get_paraphrases_by_question(self) -> str:
        return self.get_root_path_data("paraphrases_by_question.csv")

    def get_root_path_data(self, p: str = None) -> str:
        return self._path_from(os.path.dirname(self.root_path_data_mentors), p)

    def get_root_path_data_mentors(self, p: str = None) -> str:
        return self._path_from(self.root_path_data_mentors, p)

    def get_root_path_video_mentors(self, p: str = None) -> str:
        return self._path_from(os.path.dirname(self.root_path_video_mentors), p)

    def get_sessions_data_path(self) -> str:
        return os.path.join(self.get_mentor_data(), ".mentor", "sessions.yaml")

    def get_topics_by_question(self) -> str:
        return self.get_root_path_data("topics_by_question.csv")

    def get_training_classifier_data(self) -> str:
        return self.get_data_path("classifier_data.csv")

    def get_training_questions_paraphrases_answers(self) -> str:
        return self.get_data_path("questions_paraphrases_answers.csv")

    def get_training_prompts_utterances(self) -> str:
        return self.get_data_path("prompts_utterances.csv")

    def get_training_utterance_data(self) -> str:
        return self.get_data_path("utterance_data.csv")

    def get_utterances_data_path(self) -> str:
        return os.path.join(self.get_mentor_data(), ".mentor", "utterances.yaml")

    def find_and_assign_assets(self, utterance: Utterance) -> None:
        t = self.find_asset(utterance, SESSION_TIMESTAMPS)
        utterance.sessionTimestamps = (
            self.to_relative_path(t, SESSION_TIMESTAMPS.get_mentor_asset_root())
            if t
            else utterance.sessionTimestamps
        )
        v = self.find_asset(utterance, SESSION_VIDEO)
        utterance.sessionVideo = (
            self.to_relative_path(v, SESSION_VIDEO.get_mentor_asset_root())
            if v
            else utterance.sessionVideo
        )
        a = self.find_asset(utterance, SESSION_AUDIO)
        utterance.sessionAudio = (
            self.to_relative_path(a, SESSION_AUDIO.get_mentor_asset_root())
            if a
            else utterance.sessionAudio
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
            self._mentor_asset_isfile(
                asset_type.get_mentor_asset_root(), configured_path
            )
            or return_non_existing_paths
        ):
            return self.get_mentor_asset(
                asset_type.get_mentor_asset_root(), configured_path
            )
        inferred_path = asset_type.get_utterance_inferred_path(utterance)
        if inferred_path and (
            self._mentor_asset_isfile(asset_type.get_mentor_asset_root(), inferred_path)
            or return_non_existing_paths
        ):
            return self.get_mentor_asset(
                asset_type.get_mentor_asset_root(), inferred_path
            )
        return None

    def find_first_existing_asset(
        self, utterance: Utterance, asset_types: List[UtteranceAssetType]
    ) -> str:
        for a in asset_types:
            a_path = self.find_asset(utterance, a, return_non_existing_paths=False)
            if a_path:
                return a_path
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

    def find_utterance_captions(
        self, utterance: Utterance = None, return_non_existing_paths=False
    ) -> str:
        return self.find_asset(
            utterance,
            UTTERANCE_CAPTIONS,
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

    def find_utterance_video_mobile(
        self, utterance: Utterance = None, return_non_existing_paths=False
    ) -> str:
        return self.find_asset(
            utterance,
            UTTERANCE_VIDEO_MOBILE,
            return_non_existing_paths=return_non_existing_paths,
        )

    def find_utterance_video_web(
        self, utterance: Utterance = None, return_non_existing_paths=False
    ) -> str:
        return self.find_asset(
            utterance,
            UTTERANCE_VIDEO_WEB,
            return_non_existing_paths=return_non_existing_paths,
        )

    def load_paraphrases_by_question_from_csv(
        self, allow_file_not_exists=False
    ) -> ParaphrasesByQuestion:
        return _load_paraphrases_by_question_from_csv(
            self.get_paraphrases_by_question(),
            allow_file_not_exists=allow_file_not_exists,
        )

    def load_topics_by_question_from_csv(
        self, allow_file_not_exists=False
    ) -> TopicsByQuestion:
        return _load_topics_by_question_from_csv(
            self.get_topics_by_question(), allow_file_not_exists=allow_file_not_exists
        )

    def load_training_classifier_data(self) -> pd.DataFrame:
        return _load_training_classifier_data(self.get_training_classifier_data())

    def load_training_prompts_utterances(self) -> pd.DataFrame:
        return _load_training_prompts_utterances(self.get_training_prompts_utterances())

    def load_training_questions_paraphrases_answers(self) -> pd.DataFrame:
        return _load_training_questions_paraphrases_answers(
            self.get_training_questions_paraphrases_answers()
        )

    def load_training_utterance_data(self) -> pd.DataFrame:
        return _load_training_utterance_data(self.get_training_utterance_data())

    def load_utterances(self, create_new=False) -> UtteranceMap:
        data_path = self.get_utterances_data_path()
        if not os.path.isfile(data_path):
            return UtteranceMap() if create_new else None
        return utterances_from_yaml(data_path)

    def set_session_audio_path(
        self, utterance: Utterance, session_audio_path: str
    ) -> None:
        utterance.sessionAudio = self.to_relative_path(
            session_audio_path, SESSION_AUDIO.get_mentor_asset_root()
        )

    def set_session_video_path(
        self, utterance: Utterance, session_video_path: str
    ) -> None:
        utterance.sessionVideo = self.to_relative_path(
            session_video_path, SESSION_VIDEO.get_mentor_asset_root()
        )

    def set_utterance_audio_path(
        self, utterance: Utterance, utterance_audio_path: str
    ) -> None:
        utterance.utteranceAudio = self.to_relative_path(
            utterance_audio_path, UTTERANCE_AUDIO.get_mentor_asset_root()
        )

    def set_utterance_video_path(
        self, utterance: Utterance, utterance_video_path: str
    ) -> None:
        utterance.utteranceVideo = self.to_relative_path(
            utterance_video_path, UTTERANCE_VIDEO.get_mentor_asset_root()
        )

    def set_utterance_video_mobile_path(
        self, utterance: Utterance, utterance_video_path: str
    ) -> None:
        utterance.utteranceVideo = self.to_relative_path(
            utterance_video_path, UTTERANCE_VIDEO.get_mentor_asset_root()
        )

    def to_relative_path(self, p: str, mentor_asset_root: MentorAssetRoot) -> str:
        return os.path.relpath(p, self.get_mentor_asset(mentor_asset_root))

    def write_training_classifier_data(self, d: pd.DataFrame) -> None:
        _write_training_classifier_data(d, self.get_training_classifier_data())

    def write_training_prompts_utterances(self, d: pd.DataFrame) -> None:
        _write_training_prompts_utterances(d, self.get_training_prompts_utterances())

    def write_training_questions_paraphrases_answers(self, d: pd.DataFrame) -> None:
        _write_training_questions_paraphrases_answers(
            d, self.get_training_questions_paraphrases_answers()
        )

    def write_training_utterance_data(self, d: pd.DataFrame) -> None:
        _write_training_utterance_data(d, self.get_training_utterance_data())

    def write_utterances(self, utterances: UtteranceMap) -> None:
        utterances_to_yaml(utterances, self.get_utterances_data_path())
