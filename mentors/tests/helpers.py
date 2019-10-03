import os
from typing import List
from unittest.mock import call, Mock

from pipeline.mentorpath import MentorPath
from pipeline.utils import yaml_load


class Bunch:
    """
    Useful for mocking class instances.

    In python, you cannot access dictionary keys with .[prop] notation,
    e.g. you can access a property like this `mydict['myprop']`
    but not like this `mydict.prop`

    So when you want to mock an object that has properties,
    you can't just use a dictionary. You *can* instead
    just use Bunches like this:

    ```
    myObj = Bunch(
        myProp = Bunch(myNestedProp = 'a')
    )

    print(myObj.myProp.myNestedProp) # prints 'a'
    ```
    """

    def __init__(self, **kwds):
        self.__dict__.update(kwds)


class MockTranscriptions:
    mock_transcribe: Mock
    expected_transcribe_calls: List

    def __init__(self, mock_transcribe: Mock):
        self.mock_transcribe = mock_transcribe

    def load_expected_calls(
        self, mpath: MentorPath, mock_transcribe_calls_yaml="mock-transcribe-calls.yaml"
    ) -> None:
        mock_transcribe_calls = yaml_load(
            mpath.get_mentor_path(mock_transcribe_calls_yaml)
        )
        self.expected_transcribe_calls = []
        expected_transcribe_returns = []
        for call_data in mock_transcribe_calls:
            self.expected_transcribe_calls.append(
                call(mpath.get_mentor_path(call_data.get("audio")))
            )
            expected_transcribe_returns.append(call_data.get("transcript"))
        self.mock_transcribe.side_effect = expected_transcribe_returns

    def expect_calls(self) -> None:
        self.mock_transcribe.assert_has_calls(self.expected_transcribe_calls)


def _on_slice_audio_create_dummy_output(  # noqa: E302
    src_file: str, target_file: str, time_start: float, time_end: float
) -> None:
    print(f"\n\nCALLED _on_slice_audio_create_dummy_output target={target_file}")
    output_command = (
        f"-ss {time_start} -to {time_end} -c:a libvorbis -q:a 5 -loglevel quiet"
    )
    os.makedirs(os.path.dirname(target_file), exist_ok=True)
    with open(target_file, "w") as f:
        f.write(
            f"ffmpy.FFmpeg(inputs={{{src_file}: None}} outputs={{{target_file}: {output_command}}}"
        )


class MockAudioSlicer:
    create_dummy_output_files: bool
    mock_slice_audio: Mock

    def __init__(self, mock_slice_audio: Mock, create_dummy_output_files=True):
        self.mock_slice_audio = mock_slice_audio
        self.create_dummy_output_files = create_dummy_output_files
        if create_dummy_output_files:
            mock_slice_audio.side_effect = _on_slice_audio_create_dummy_output
