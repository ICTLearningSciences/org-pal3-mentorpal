from abc import ABC, abstractmethod
from importlib import import_module


class TranscriptionService(ABC):
    @abstractmethod
    def transcribe(self, audio_file: str) -> str:
        return None

    @abstractmethod
    def init_service(self) -> None:
        return None


def init_transcription_service() -> TranscriptionService:
    m = import_module(f"pipeline.transcriptions.watson")
    s = m.WatsonTranscriptionService()
    s.init_service()
    return s
