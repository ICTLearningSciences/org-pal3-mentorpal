import os

import pytest

from pipeline.mentorpath import MentorPath
from pipeline.utterances import Utterance


MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(
        ".", "tests", "resources", "test_mentorpath_assign_asset_paths", "mentors"
    )
)


@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_assigns_session_asset_paths_for_existing_assets_when_session_timestamps_set(
    mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path_data_mentors=mentor_data_root)
    u1 = mpath.find_and_assign_assets(
        Utterance(sessionTimestamps="build/recordings/session1/p1-some-questions.csv")
    )
    assert "build/recordings/session1/p1-some-questions.mp3" == u1.sessionAudio
    assert "build/recordings/session1/p1-some-questions.csv" == u1.sessionTimestamps
    assert "build/recordings/session1/p1-some-questions.mp4" == u1.sessionVideo


@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_assigns_session_asset_paths_for_existing_assets_when_session_video_set(
    mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path_data_mentors=mentor_data_root)
    u1 = mpath.find_and_assign_assets(
        Utterance(sessionVideo="build/recordings/session1/p1-some-questions.mp4")
    )
    assert "build/recordings/session1/p1-some-questions.mp3" == u1.sessionAudio
    assert "build/recordings/session1/p1-some-questions.csv" == u1.sessionTimestamps
    assert "build/recordings/session1/p1-some-questions.mp4" == u1.sessionVideo


@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_assigns_session_asset_paths_for_existing_assets_when_session_audio_set(
    mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path_data_mentors=mentor_data_root)
    u1 = mpath.find_and_assign_assets(
        Utterance(sessionAudio="build/recordings/session1/p1-some-questions.mp3")
    )
    assert "build/recordings/session1/p1-some-questions.mp3" == u1.sessionAudio
    assert "build/recordings/session1/p1-some-questions.csv" == u1.sessionTimestamps
    assert "build/recordings/session1/p1-some-questions.mp4" == u1.sessionVideo


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor-missing-timestamps")]
)
def test_it_does_not_assign_session_timestamps_when_missing(
    mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path_data_mentors=mentor_data_root)
    u1 = mpath.find_and_assign_assets(
        Utterance(sessionAudio="build/recordings/session1/p1-some-questions.mp3")
    )
    assert "build/recordings/session1/p1-some-questions.mp3" == u1.sessionAudio
    assert u1.sessionTimestamps is None
    assert "build/recordings/session1/p1-some-questions.mp4" == u1.sessionVideo


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor-missing-video")]
)
def test_it_does_not_assign_session_video_when_missing(
    mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path_data_mentors=mentor_data_root)
    u1 = mpath.find_and_assign_assets(
        Utterance(sessionAudio="build/recordings/session1/p1-some-questions.mp3")
    )
    assert "build/recordings/session1/p1-some-questions.mp3" == u1.sessionAudio
    assert "build/recordings/session1/p1-some-questions.csv" == u1.sessionTimestamps
    assert u1.sessionVideo is None


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor-missing-audio")]
)
def test_it_does_not_assign_session_audio_when_missing(
    mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path_data_mentors=mentor_data_root)
    u1 = mpath.find_and_assign_assets(
        Utterance(sessionVideo="build/recordings/session1/p1-some-questions.mp4")
    )
    assert u1.sessionAudio is None
    assert "build/recordings/session1/p1-some-questions.csv" == u1.sessionTimestamps
    assert "build/recordings/session1/p1-some-questions.mp4" == u1.sessionVideo
