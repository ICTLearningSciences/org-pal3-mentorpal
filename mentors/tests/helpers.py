from distutils.dir_util import copy_tree
import glob
import os
from shutil import copyfile
from tempfile import mkdtemp
from typing import List
from unittest.mock import call, Mock

from pipeline.mentorpath import MentorPath
from pipeline.process import (
    SessionToAudioResultSummary,
    session_to_audio_result_summary_from_yaml,
)
from pipeline.utils import yaml_load
from pipeline.utterance_asset_type import UtteranceAssetType
from pipeline.utterances import Utterance, UtteranceMap, utterances_from_yaml


def assert_utterance_asset_exists(
    mp: MentorPath, u: Utterance, asset_type: UtteranceAssetType
) -> None:
    expected_path = mp.find_asset(u, asset_type, return_non_existing_paths=True)
    assert os.path.isfile(
        expected_path
    ), "expected file for utterance {} and asset type {} at path {}".format(
        u.get_id(), asset_type.get_name(), expected_path
    )


def assert_session_to_audio_result_summary_match_expected(
    mp: MentorPath,
    actual_data: SessionToAudioResultSummary,
    expected_data_file="expected-session-to-audio-summary.yaml",
) -> None:
    """
    Test helper to assert that summary for process.session_to_audio match expected for a mentorpath

    Args:
    - mp: the MentorPath
    - actual_data: SessionToAudioResultSummary
    - expected_file: path to the location of the expected-utterances (stored in yaml)
    """
    expected_data_path = mp.get_mentor_data(expected_data_file)
    assert os.path.isfile(
        expected_data_path
    ), f"requires a yaml file of expected summary for SessionToAudioResultSummary at {expected_data_path}"
    expected_data = session_to_audio_result_summary_from_yaml(expected_data_path)
    assert expected_data.to_dict() == actual_data.to_dict()


def load_expected_utterances(
    mp: MentorPath, expected_utterances_file="expected-utterances.yaml"
) -> UtteranceMap:
    expected_utterance_path = mp.get_mentor_data(expected_utterances_file)
    assert os.path.isfile(
        expected_utterance_path
    ), f"assert_utterances_match_expected requires a yaml file of expected utterances at {expected_utterance_path}"
    return utterances_from_yaml(expected_utterance_path)


def assert_utterances_match_expected(
    mp: MentorPath,
    utterances: UtteranceMap = None,
    expected_utterances_file: str = "expected-utterances.yaml",
) -> None:
    """
    Test helper to assert that utterances match expected for a mentorpath

    Args:
    - mp: the MentorPath
    - utterances: the actual utterances, if not passed will look for utterances at the default mentorpath location
    - expected_utterances_file: path to the location of the expected-utterances (stored in yaml)
    """
    utterances = utterances or mp.load_utterances()
    assert isinstance(
        utterances, UtteranceMap
    ), f"should be utterances file at {mp.get_utterances_data_path()}"
    expected_utterances = load_expected_utterances(mp, expected_utterances_file)
    assert expected_utterances.to_dict() == utterances.to_dict()


def copy_mentor_to_tmp(
    mentor: str, mentor_data_root: str, copy_root_sibling_files: str = "*.csv"
) -> MentorPath:
    tmp_mentors = mkdtemp()
    mentor_data_root_tgt = os.path.join(tmp_mentors, "data", "mentors")
    os.makedirs(mentor_data_root_tgt)
    mpath_src = MentorPath(mentor_id=mentor, root_path_data_mentors=mentor_data_root)
    mpath_tgt = MentorPath(
        mentor_id=mentor, root_path_data_mentors=mentor_data_root_tgt
    )
    src_mentor_data = mpath_src.get_mentor_data()
    tgt_mentor_data = mpath_tgt.get_mentor_data()
    copy_tree(src_mentor_data, tgt_mentor_data)
    if copy_root_sibling_files:
        for copy_src in glob.glob(
            mpath_src.get_root_path_data(copy_root_sibling_files)
        ):
            rel_path = os.path.relpath(copy_src, mpath_src.get_root_path_data())
            copy_tgt = mpath_tgt.get_root_path_data(rel_path)
            copyfile(copy_src, copy_tgt)
    src_mentor_videos = mpath_src.get_mentor_video()
    if os.path.isdir(src_mentor_videos):
        tgt_mentor_videos = mpath_tgt.get_mentor_video()
        os.makedirs(tgt_mentor_videos)
        copy_tree(src_mentor_videos, tgt_mentor_videos)
    return mpath_tgt


def resource_root_for_test(test_file: str) -> str:
    return os.path.abspath(
        os.path.join(
            ".", "tests", "resources", os.path.splitext(os.path.basename(test_file))[0]
        )
    )


def resource_root_mentors_for_test(test_file: str) -> str:
    return os.path.join(resource_root_for_test(test_file), "mentors")


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


def mock_isfile_with_paths(mock_isfile: Mock, true_paths: List[str]) -> Mock:
    mock_isfile.side_effect = lambda p: p in true_paths
    return mock_isfile


class MockAudioSlicer:
    """
    Mocks `media_tools.slice_audio` to create dummy versions
    of the audio files that would be output by the real function.

    This helps test cases that go through code that transcribes the audio.
    The transcriptions can be easily mocked to return fake transcriptions,
    but the code will generally check the existance of the files first
    and fail if it doesn't find them.
    """

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

    def __init__(
        self,
        mock_slice_audio: Mock,
        mock_logging_info: Mock = None,
        create_dummy_output_files=True,
    ):
        self.mock_slice_audio = mock_slice_audio
        self.mock_logging_info = mock_logging_info
        self.create_dummy_output_files = create_dummy_output_files
        if create_dummy_output_files:
            mock_slice_audio.side_effect = self._on_slice_audio_create_dummy_output

    def assert_has_calls(
        self,
        mpath: MentorPath,
        expected_calls_yaml="expected-slice-audio-calls.yaml",
        fail_on_no_calls=False,
    ) -> None:
        expected_calls_yaml_path = mpath.get_mentor_data(expected_calls_yaml)
        if fail_on_no_calls:
            assert os.path.isfile(
                expected_calls_yaml_path
            ), f"expected mock-slice-audio calls at path {expected_calls_yaml_path}"
        expected_calls_data = yaml_load(expected_calls_yaml_path)
        expected_calls = [
            call(
                mpath.get_mentor_data(call_data.get("source")),
                mpath.get_mentor_data(call_data.get("target")),
                call_data.get("time_start_secs"),
                call_data.get("time_end_secs"),
            )
            for call_data in expected_calls_data
        ]
        expected_calls_logging_info = [
            call(
                f"utterance_to_audio [{i + 1}/{len(expected_calls_data)}] source={mpath.get_mentor_data(call_data.get('source'))}, target={mpath.get_mentor_data(call_data.get('target'))}, time-start={call_data.get('time_start_secs')}, time-end={call_data.get('time_end_secs')}"
            )
            for i, call_data in enumerate(expected_calls_data)
        ]
        if fail_on_no_calls:
            assert (
                len(expected_calls) > 0
            ), f"expected mock-slice-audio calls at path {expected_calls_yaml_path}"
        self.mock_slice_audio.assert_has_calls(expected_calls)
        if self.mock_logging_info:
            self.mock_logging_info.assert_has_calls(expected_calls_logging_info)


class MockMediaConverter:
    """
    Mocks a function that converts media having args src and tgt.
    Can also create dummy files at the target paths

    This helps test cases that go through code that needs session audio
    """

    def _on_convert_create_dummy_output(self, src_file: str, tgt_file: str) -> None:
        os.makedirs(os.path.dirname(tgt_file), exist_ok=True)
        with open(tgt_file, "w") as f:
            f.write(
                f"ffmpy.FFmpeg(inputs={{{src_file}: None}} outputs={{{tgt_file}: some command}}"
            )

    def __init__(
        self,
        mock_convert_src_to_tgt: Mock,
        mock_logging_info: Mock = None,
        create_dummy_output_files=True,
    ):
        self.mock_convert_src_to_tgt = mock_convert_src_to_tgt
        self.mock_logging_info = mock_logging_info
        self.create_dummy_output_files = create_dummy_output_files
        if create_dummy_output_files:
            mock_convert_src_to_tgt.side_effect = self._on_convert_create_dummy_output

    def expect_calls(
        self,
        mpath: MentorPath,
        expected_calls_yaml="expected-media-converter-calls.yaml",
        logging_function_name="media_converter",
        fail_on_no_calls=False,
    ) -> None:
        yaml_path = mpath.get_mentor_data(expected_calls_yaml)
        if not os.path.isfile(yaml_path):
            if fail_on_no_calls:
                raise (Exception(f"expected calls yaml file at path {yaml_path}"))
            else:
                return
        mock_calls = yaml_load(yaml_path)
        expected_calls = []
        expected_calls_logging_info = []
        for i, call_data in enumerate(mock_calls):
            src_path = mpath.get_mentor_video(call_data.get("source"))
            tgt_path = mpath.get_mentor_video(call_data.get("target"))
            expected_calls.append(call(src_path, tgt_path))
            expected_calls_logging_info.append(
                call(
                    f"{logging_function_name} [{i + 1}/{len(mock_calls)}] source={src_path}, target={tgt_path}"
                )
            )
        if fail_on_no_calls and not expected_calls:
            raise (Exception(f"expected mock-media-converter calls"))
        self.mock_convert_src_to_tgt.assert_has_calls(expected_calls)
        if self.mock_logging_info:
            self.mock_logging_info.assert_has_calls(expected_calls_logging_info)


class MockTranscriptions:
    """
    Test-helper class for mocking the TranscriptionService
    (which is presumably an online API).

    To use, create a mock-transcribe-call.yaml file in the root
    of a test-mentor directory and fill with entries like this:

        - audio: build/utterance_audio/s001p001s00000000e00000100.mp3
          transcript: mentor answer to question 1

    then call `load_expected_calls` to set up the mock
    to expect the calls and return the transcripts as configured
    """

    def __init__(
        self, mock_init_transcription_service: Mock, mock_logging_info: Mock = None
    ):
        self.mock_service = Mock()
        self.mock_logging_info = mock_logging_info
        mock_init_transcription_service.return_value = self.mock_service

    def load_expected_calls(
        self, mpath: MentorPath, mock_transcribe_calls_yaml="mock-transcribe-calls.yaml"
    ) -> None:
        mock_transcribe_calls = yaml_load(
            mpath.get_mentor_data(mock_transcribe_calls_yaml)
        )
        self.expected_transcribe_calls = []
        self.expected_calls_logging_info = []
        expected_transcribe_returns = []
        for i, call_data in enumerate(mock_transcribe_calls):
            audio_path = mpath.get_mentor_data(call_data.get("audio"))
            self.expected_transcribe_calls.append(call(audio_path))
            expected_transcribe_returns.append(call_data.get("transcript"))
            self.expected_calls_logging_info.append(
                call(
                    f"transcribe [{i + 1}/{len(mock_transcribe_calls)}] audio={audio_path}"
                )
            )
        self.mock_service.transcribe.side_effect = expected_transcribe_returns

    def expect_calls(self) -> None:
        self.mock_service.transcribe.assert_has_calls(self.expected_transcribe_calls)
        if self.mock_logging_info:
            self.mock_logging_info.assert_has_calls(self.expected_calls_logging_info)


class MockVideoSlicer:
    """
    Mocks `media_tools.slice_video` to create dummy versions
    of the video files that would be output by the real function.
    """

    def _on_slice_create_dummy_output(
        self, src_file: str, tgt_file: str, time_start: float, time_end: float
    ) -> None:
        os.makedirs(os.path.dirname(tgt_file), exist_ok=True)
        with open(tgt_file, "w") as f:
            f.write(
                f"ffmpy.FFmpeg(inputs={{{src_file}: None}} outputs={{{tgt_file}: some command}} --ss {time_start} --to {time_end}"
            )

    def __init__(
        self,
        mock_slice_video: Mock,
        mock_logging_info: Mock = None,
        create_dummy_output_files=True,
    ):
        self.mock_slice_video = mock_slice_video
        self.mock_logging_info = mock_logging_info
        self.create_dummy_output_files = create_dummy_output_files
        if create_dummy_output_files:
            mock_slice_video.side_effect = self._on_slice_create_dummy_output

    def assert_has_calls(
        self,
        mpath: MentorPath,
        expected_calls_yaml="expected-slice-video-calls.yaml",
        fail_on_no_calls=False,
    ) -> None:
        expected_calls_yaml_path = mpath.get_mentor_data(expected_calls_yaml)
        if fail_on_no_calls:
            assert os.path.isfile(
                expected_calls_yaml_path
            ), f"expected mock-slice-video calls at path {expected_calls_yaml_path}"
        expected_calls_data = yaml_load(expected_calls_yaml_path)
        expected_calls = [
            call(
                mpath.get_mentor_data(call_data.get("source")),
                mpath.get_mentor_video(call_data.get("target")),
                call_data.get("time_start_secs"),
                call_data.get("time_end_secs"),
            )
            for call_data in expected_calls_data
        ]
        expected_calls_logging_info = [
            call(
                f"utterance_to_video [{i + 1}/{len(expected_calls_data)}] source={mpath.get_mentor_data(call_data.get('source'))}, target={mpath.get_mentor_video(call_data.get('target'))}, time-start={call_data.get('time_start_secs')}, time-end={call_data.get('time_end_secs')}"
            )
            for i, call_data in enumerate(expected_calls_data)
        ]
        if fail_on_no_calls:
            assert (
                len(expected_calls) > 0
            ), f"expected mock-slice-video calls at path {expected_calls_yaml_path}"
        self.mock_slice_video.assert_has_calls(expected_calls)
        if self.mock_logging_info:
            self.mock_logging_info.assert_has_calls(expected_calls_logging_info)


class MockVideoToAudioConverter:
    """
    Mocks `media_tools.video_to_audio` to create dummy versions
    of the audio files that would be output by the real function.

    This helps test cases that go through code that needs session audio
    """

    def _on_video_to_audio_create_dummy_output(
        self, src_file: str, tgt_file: str
    ) -> None:
        os.makedirs(os.path.dirname(tgt_file), exist_ok=True)
        with open(tgt_file, "w") as f:
            f.write(
                f"ffmpy.FFmpeg(inputs={{{src_file}: None}} outputs={{{tgt_file}: some command}}"
            )

    def __init__(
        self,
        mock_video_to_audio: Mock,
        mock_logging_info: Mock = None,
        create_dummy_output_files=True,
    ):
        self.mock_video_to_audio = mock_video_to_audio
        self.mock_logging_info = mock_logging_info
        self.create_dummy_output_files = create_dummy_output_files
        if create_dummy_output_files:
            mock_video_to_audio.side_effect = (
                self._on_video_to_audio_create_dummy_output
            )

    def expect_calls(
        self,
        mpath: MentorPath,
        expected_calls_yaml="expected-video-to-audio-calls.yaml",
        fail_on_no_calls=False,
    ) -> None:
        yaml_path = mpath.get_mentor_data(expected_calls_yaml)
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
        expected_calls = []
        expected_calls_logging_info = []
        for i, call_data in enumerate(mock_calls):
            video_path = mpath.get_mentor_data(call_data.get("video"))
            audio_path = mpath.get_mentor_data(call_data.get("audio"))
            expected_calls.append(call(video_path, audio_path))
            expected_calls_logging_info.append(
                call(
                    f"sessions_to_audio [{i + 1}/{len(mock_calls)}] video={video_path}, audio={audio_path}"
                )
            )
        if fail_on_no_calls and not self.expected_calls:
            raise (Exception(f"expected mock-video-to-audio calls"))
        self.mock_video_to_audio.assert_has_calls(expected_calls)
        if self.mock_logging_info:
            self.mock_logging_info.assert_has_calls(expected_calls_logging_info)
