import os
from typing import Callable, Dict

from pipeline.utterances import Utterance

_ASSET_TYPE_BY_PROP_NAME = dict()


def _convert_ext(p: str, new_ext: str) -> str:
    stem = os.path.splitext(p)[0]
    return f"{stem}.{new_ext}"


class UtteranceAssetType:
    """
    Represents an asset type that a mentor utterance should possess.
    Generally DO NOT create instances of this class;
    instead use the instances exported by this module, e.g. SESSION_AUDIO
    """

    _default_file_ext: str
    _infer_path_from_props: Dict[str, Callable[[str], str]]
    _infer_path_from_utterance: Callable[[Utterance], str]
    _utterance_prop_name: str

    def __init__(
        self,
        utterance_prop_name: str,
        default_file_ext: str,
        infer_path_from_props: Dict[str, Callable[[str], str]] = None,
        infer_path_from_utterance: Callable[[Utterance], str] = None,
    ):
        self._utterance_prop_name = utterance_prop_name
        self._default_file_ext = default_file_ext
        self._infer_path_from_props = infer_path_from_props or []
        self._infer_path_from_utterance = infer_path_from_utterance
        _ASSET_TYPE_BY_PROP_NAME[utterance_prop_name] = self

    def get_utterance_val(self, u: Utterance) -> str:
        return getattr(u, self._utterance_prop_name)

    def get_utterance_inferred_path(self, u: Utterance) -> str:
        for p, convert_func in self._infer_path_from_props.items():
            asset_type = _ASSET_TYPE_BY_PROP_NAME.get(p)
            if not asset_type:
                continue
            asset_path_from = asset_type.get_utterance_val(u)
            if asset_path_from:
                return (
                    convert_func(asset_path_from)
                    if convert_func
                    else self.convert_ext(asset_path_from)
                )
        return (
            self._infer_path_from_utterance(u)
            if self._infer_path_from_utterance
            else None
        )

    def convert_ext(self, p: str) -> str:
        return _convert_ext(p, self.get_default_file_ext())

    def get_default_file_ext(self):
        return self._default_file_ext


SESSION_AUDIO = UtteranceAssetType(
    "sessionAudio",
    "mp3",
    infer_path_from_props=dict(sessionTimestamps=None, sessionVideo=None),
)
SESSION_TIMESTAMPS = UtteranceAssetType(
    "sessionTimestamps",
    "csv",
    infer_path_from_props=dict(sessionVideo=None, sessionAudio=None),
)
SESSION_VIDEO = UtteranceAssetType(
    "sessionVideo",
    "mp4",
    infer_path_from_props=dict(sessionTimestamps=None, sessionAudio=None),
)
UTTERANCE_AUDIO = UtteranceAssetType(
    "utteranceAudio",
    "mp3",
    infer_path_from_props=dict(
        utteranceVideo=lambda p: _convert_ext(
            p.replace("utterance_video", "utterance_audio"), "mp3"
        )
    ),
    infer_path_from_utterance=lambda u: os.path.join(
        "build", "utterance_audio", f"{u.get_id()}.mp3"
    ),
)
UTTERANCE_VIDEO = UtteranceAssetType(
    "utteranceVideo",
    "mp4",
    infer_path_from_props=dict(
        utteranceAudio=lambda p: _convert_ext(
            p.replace("utterance_audio", "utterance_video"), "mp4"
        )
    ),
)
