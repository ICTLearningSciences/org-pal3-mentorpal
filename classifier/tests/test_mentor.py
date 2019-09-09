from os import path
import pytest

from mentorpal.mentor import Mentor


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id",
    [('./tests/resources/mentors', 'mentor_01')]
)
def test_it_loads_from_a_profile_yaml_file(mentor_data_root, mentor_id):
    m = Mentor(mentor_id, mentor_data_root=path.join(mentor_data_root, mentor_id, 'data'))
    assert m.get_id() == mentor_id
