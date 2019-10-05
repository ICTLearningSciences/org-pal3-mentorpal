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
    mpath = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    u1 = mpath.find_and_assign_assets(
        Utterance(sessionTimestamps="build/recordings/session1/p1-some-questions.csv")
    )
    assert u1.sessionAudio == "build/recordings/session1/p1-some-questions.wav"
    assert u1.sessionTimestamps == "build/recordings/session1/p1-some-questions.csv"
    assert u1.sessionVideo == "build/recordings/session1/p1-some-questions.mp4"


@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_assigns_session_asset_paths_for_existing_assets_when_session_video_set(
    mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    u1 = mpath.find_and_assign_assets(
        Utterance(sessionVideo="build/recordings/session1/p1-some-questions.mp4")
    )
    assert u1.sessionAudio == "build/recordings/session1/p1-some-questions.wav"
    assert u1.sessionTimestamps == "build/recordings/session1/p1-some-questions.csv"
    assert u1.sessionVideo == "build/recordings/session1/p1-some-questions.mp4"


@pytest.mark.parametrize("mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1")])
def test_it_assigns_session_asset_paths_for_existing_assets_when_session_audio_set(
    mentor_data_root: str, mentor_id: str
):
    mpath = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    u1 = mpath.find_and_assign_assets(
        Utterance(sessionAudio="build/recordings/session1/p1-some-questions.wav")
    )
    assert u1.sessionAudio == "build/recordings/session1/p1-some-questions.wav"
    assert u1.sessionTimestamps == "build/recordings/session1/p1-some-questions.csv"
    assert u1.sessionVideo == "build/recordings/session1/p1-some-questions.mp4"
