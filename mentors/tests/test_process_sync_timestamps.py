import os
import pytest

from mentorpath import MentorPath
from sessions import sessions_from_yaml
# import utils

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_process_sync_timestamps", "mentors")
)


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id",
    [(MENTOR_DATA_ROOT, "mentor-with-no-preexisting-sessions-data")],
)
def test_it_generates_sessions_with_no_prexisting_sessions_data(
    mentor_data_root: str, mentor_id: str
):
    mp = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    expected_sessions = sessions_from_yaml(mp.get_mentor_path("expected-sessions.yaml"))
    assert expected_sessions is not None
