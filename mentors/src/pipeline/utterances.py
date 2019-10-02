from dataclasses import asdict, dataclass, field
import math
from typing import Dict, List

from pipeline.utterance_type import UtteranceType
from pipeline.utils import yaml_load


def _to_slice_timestr(secs_total: float) -> str:
    m, s = divmod(secs_total, 60)
    h, m = divmod(m, 60)
    hs = int(round(secs_total - math.floor(secs_total), 2) * 100)
    return f"{int(h):02}{int(m):02}{int(s):02}{hs:02}"


def _utterance_id(session: int, part: int, time_start: float, time_end: float) -> str:
    return f"s{session:03}p{part:03}s{_to_slice_timestr(time_start)}e{_to_slice_timestr(time_end)}"


@dataclass
class Utterance:
    errorMessage: str = None
    mentor: str = None
    question: str = None
    part: int = 1
    session: int = 1
    sessionAudio: str = None
    sessionTimestamps: str = None
    sessionVideo: str = None
    timeEnd: float = -1.0
    timeStart: float = -1.0
    transcript: str = None
    utteranceAudio: str = None
    utteranceType: UtteranceType = None

    def __post_init__(self):
        if isinstance(self.utteranceType, str):
            self.utteranceType = UtteranceType.for_value(self.utteranceType)

    def get_id(self):
        return _utterance_id(self.session, self.part, self.timeStart, self.timeEnd)

    def to_dict(self):
        return asdict(self)


@dataclass
class UtteranceMap:
    utterancesById: Dict[str, Utterance] = field(default_factory=lambda: {})

    def __post_init__(self):
        self.utterancesById = {
            k: v if isinstance(v, Utterance) else Utterance(**v)
            for (k, v) in self.utterancesById.items()
        }

    def apply_timestamps(
        self,
        session: int,
        part: int,
        sessionTimestamps: str,
        timestampRows: List[Utterance],
    ) -> None:
        for u in timestampRows:
            self.utterancesById[u.get_id()] = u

    def find_one(
        self, session: int, part: int, time_start: float, time_end: float
    ) -> Utterance:
        uid = _utterance_id(session, part, time_start, time_end)
        return self.utterancesById.get(uid)

    def set_transcript(self, uid: str, transcript: str, source_audio: str) -> bool:
        if uid not in self.utterancesById:
            return False
        u = self.utterancesById[uid]
        u.transcript = transcript
        u.utteranceAudio = source_audio

    def to_dict(self):
        return asdict(self)

    def utterances(self) -> List[Utterance]:
        return sorted(
            self.utterancesById.values(), key=lambda u: (u.session, u.part, u.timeStart)
        )


def copy_utterance(u: Utterance) -> Utterance:
    return Utterance(**u.to_dict())


def copy_utterances(u: UtteranceMap) -> UtteranceMap:
    return UtteranceMap(**u.to_dict())


def utterances_from_yaml(yml: str) -> UtteranceMap:
    d = yaml_load(yml)
    if "utterances" in d:
        ulist = [Utterance(**u) for u in d.get("utterances")]
        return UtteranceMap(**dict(utterancesById={u.get_id(): u for u in ulist}))
    else:
        return UtteranceMap(**d)
