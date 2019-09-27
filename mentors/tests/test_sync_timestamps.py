import os
import pytest

from mentorpath import MentorPath
from process import sync_timestamps
from utterances import utterances_from_yaml

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_sync_timestamps", "mentors")
)


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1-clean-slate")]
)
def test_it_generates_utterances_from_timestamps(mentor_data_root: str, mentor_id: str):
    mp = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    expected_utterances = utterances_from_yaml(
        mp.get_mentor_path("expected-utterances.yaml")
    )
    actual_utterances = sync_timestamps(mp)
    assert expected_utterances.to_dict() == actual_utterances.to_dict()
