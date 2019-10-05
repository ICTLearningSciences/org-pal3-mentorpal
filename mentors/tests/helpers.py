from distutils.dir_util import copy_tree
import logging
import os
from tempfile import mkdtemp
from typing import List
from unittest.mock import call, Mock

from pipeline.mentorpath import MentorPath
from pipeline.utils import yaml_load
from pipeline.utterances import UtteranceMap, utterances_from_yaml


def assert_utterances_match_expected(
    utterances: UtteranceMap,
    mp: MentorPath,
    expected_utterances_file="expected-utterances.yaml",
) -> None:
    expected_utterance_path = mp.get_mentor_path(expected_utterances_file)
    assert os.path.isfile(
        expected_utterance_path
    ), f"assert_utterances_match_expected requires a yaml file of expected utterances at {expected_utterance_path}"
    expected_utterances = utterances_from_yaml(expected_utterance_path)
    assert expected_utterances.to_dict() == utterances.to_dict()


def copy_mentor_to_tmp(mentor: str, mentor_data_root: str) -> MentorPath:
    tmp_mentors = mkdtemp()
    mpath = MentorPath(mentor_id=mentor, root_path=tmp_mentors)
    src = os.path.join(mentor_data_root, mentor)
    tgt = mpath.get_mentor_path()
    copy_tree(src, tgt)
    logging.warning(f"review test data at {mpath.get_mentor_path()}")
    return mpath


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
    """
    Test-helper class for mocking the TranscriptionService
    (which is presumably an online API).

    To use, create a mock-transcribe-call.yaml file in the root
    of a test-mentor directory and fill with entries like this:

        - audio: build/utterance_audio/s001p001s00000000e00000100.wav
          transcript: mentor answer to question 1

    then call `load_expected_calls` to set up the mock
    to expect the calls and return the transcripts as configured
    """

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


class MockAudioSlicer:
    """
    Mocks `media_tools.slice_audio` to create dummy versions
    of the audio files that would be output by the real function.

    This helps test cases that go through code that transcribes the audio.
    The transcriptions can be easily mocked to return fake transcriptions,
    but the code will generally check the existance of the files first
    and fail if it doesn't find them.
    """

    create_dummy_output_files: bool
    mock_slice_audio: Mock

    def _on_slice_audio_create_dummy_output(  # noqa: E302
        self, src_file: str, target_file: str, time_start: float, time_end: float
    ) -> None:
        output_command = (
            f"-ss {time_start} -to {time_end} -c:a libvorbis -q:a 5 -loglevel quiet"
        )
        os.makedirs(os.path.dirname(target_file), exist_ok=True)
        with open(target_file, "w") as f:
            f.write(
                f"ffmpy.FFmpeg(inputs={{{src_file}: None}} outputs={{{target_file}: {output_command}}}"
            )

    def __init__(self, mock_slice_audio: Mock, create_dummy_output_files=True):
        self.mock_slice_audio = mock_slice_audio
        self.create_dummy_output_files = create_dummy_output_files
        self.expected_calls = []
        if create_dummy_output_files:
            mock_slice_audio.side_effect = self._on_slice_audio_create_dummy_output

    def assert_has_calls(
        self,
        mpath: MentorPath,
        expected_calls_yaml="expected-slice-audio-calls.yaml",
        fail_on_no_calls=False,
    ) -> None:
        expected_calls_yaml_path = mpath.get_mentor_path(expected_calls_yaml)
        if fail_on_no_calls:
            assert os.path.isfile(
                expected_calls_yaml_path
            ), f"expected mock-slice-audio calls at path {expected_calls_yaml_path}"
        expected_calls_data = yaml_load(expected_calls_yaml_path)
        expected_calls = [
            call(
                mpath.get_mentor_path(call_data.get("source")),
                mpath.get_mentor_path(call_data.get("target")),
                call_data.get("time_start_secs"),
                call_data.get("time_end_secs"),
            )
            for call_data in expected_calls_data
        ]
        logging.warning(f"OK  EXPECTED CALLS FINALLY={expected_calls}")
        if fail_on_no_calls:
            assert (
                len(expected_calls) > 0
            ), f"expected mock-slice-audio calls at path {expected_calls_yaml_path}"
        self.mock_slice_audio.assert_has_calls(expected_calls)


class MockVideoToAudioConverter:
    """
    Mocks `media_tools.video_to_audio` to create dummy versions
    of the audio files that would be output by the real function.

    This helps test cases that go through code that needs session audio
    """

    create_dummy_output_files: bool
    expected_calls: List
    mock_video_to_audio: Mock

    def _on_video_to_audio_create_dummy_output(
        self, src_file: str, tgt_file: str
    ) -> None:
        os.makedirs(os.path.dirname(tgt_file), exist_ok=True)
        with open(tgt_file, "w") as f:
            f.write(
                f"ffmpy.FFmpeg(inputs={{{src_file}: None}} outputs={{{tgt_file}: some command}}"
            )

    def __init__(self, mock_video_to_audio: Mock, create_dummy_output_files=True):
        self.mock_video_to_audio = mock_video_to_audio
        self.create_dummy_output_files = create_dummy_output_files
        self.expected_calls = []
        if create_dummy_output_files:
            mock_video_to_audio.side_effect = (
                self._on_video_to_audio_create_dummy_output
            )

    def expect_calls(self, fail_on_no_calls=False) -> None:
        if fail_on_no_calls and not self.expected_calls:
            raise (Exception(f"expected mock-video-to-audio calls"))
        self.mock_video_to_audio.assert_has_calls(self.expected_calls)

    def load_expected_calls(
        self,
        mpath: MentorPath,
        expected_calls_yaml="expected-video-to-audio-calls.yaml",
        fail_on_no_calls=False,
    ) -> None:
        yaml_path = mpath.get_mentor_path(expected_calls_yaml)
        if not os.path.isfile(yaml_path):
            if fail_on_no_calls:
                raise (
                    Exception(
                        f"expected mock-video-to-audio calls file at path {yaml_path}"
                    )
                )
            else:
                return
        mock_calls = yaml_load(yaml_path)
        self.expected_calls = []
        for call_data in mock_calls:
            self.expected_calls.append(
                call(
                    mpath.get_mentor_path(call_data.get("video")),
                    mpath.get_mentor_path(call_data.get("audio")),
                )
            )
