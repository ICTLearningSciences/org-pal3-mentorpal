import os

import pytest
from unittest.mock import patch

from .helpers import (
    MockMediaConverter,
    MockVideoSlicer,
    assert_utterance_asset_exists,
    assert_utterances_match_expected,
    copy_mentor_to_tmp,
    load_expected_utterances,
    resource_root_mentors_for_test,
)
from pipeline.run import Pipeline
from pipeline.utterance_asset_type import (
    UTTERANCE_VIDEO,
    UTTERANCE_VIDEO_MOBILE,
    UTTERANCE_VIDEO_WEB,
)


MENTOR_ROOT = resource_root_mentors_for_test(__file__)


@patch("shutil.copyfile")
@patch("pipeline.media_tools.video_encode_for_mobile")
@patch("pipeline.media_tools.slice_video")
@pytest.mark.parametrize("mentor_root,mentor_id", [(MENTOR_ROOT, "mentor1")])
def test_it_generates_all_videos_for_a_mentor(
    mock_slice_video,
    mock_video_encode_for_mobile,
    mock_video_encode_for_web,
    mentor_root: str,
    mentor_id: str,
):
    mpath = copy_mentor_to_tmp(
        mentor_id, os.path.join(mentor_root, mentor_id, "data", "mentors")
    )
    mock_video_slicer = MockVideoSlicer(mock_slice_video)
    mock_video_mobile = MockMediaConverter(mock_video_encode_for_mobile)
    mock_video_web = MockMediaConverter(mock_video_encode_for_web)
    p = Pipeline(mentor_id, mpath.root_path_data_mentors)
    p.videos_update()
    assert_utterances_match_expected(mpath)
    mock_video_slicer.assert_has_calls(mpath)
    mock_video_mobile.expect_calls(
        mpath,
        expected_calls_yaml="expected-video-encode-for-mobile-calls.yaml",
        logging_function_name="video_encode_for_mobile",
    )
    mock_video_web.expect_calls(
        mpath,
        expected_calls_yaml="expected-video-encode-for-web-calls.yaml",
        logging_function_name="video_encode_for_web",
    )
    expected_utterances = load_expected_utterances(mpath)
    for u in expected_utterances.utterances():
        assert_utterance_asset_exists(mpath, u, UTTERANCE_VIDEO)
        assert_utterance_asset_exists(mpath, u, UTTERANCE_VIDEO_MOBILE)
        assert_utterance_asset_exists(mpath, u, UTTERANCE_VIDEO_WEB)
