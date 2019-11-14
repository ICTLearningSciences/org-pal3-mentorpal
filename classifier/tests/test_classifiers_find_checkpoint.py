import os

import pytest

from mentorpal.checkpoints import find_checkpoint
from .helpers import resource_root_checkpoints_for_test

CHECKPOINTS_ROOT = resource_root_checkpoints_for_test(__file__)


@pytest.mark.parametrize(
    "checkpoints_root,expected_checkpoint",
    [(CHECKPOINTS_ROOT, os.path.join("lstm_v1", "2019-11-06-2357"))],
)
def test_it_finds_the_newest_checkpoint_by_alpha(checkpoints_root, expected_checkpoint):
    expected_checkpoint_abs = os.path.abspath(
        os.path.join(checkpoints_root, expected_checkpoint)
    )
    actual_checkpoint = find_checkpoint(checkpoints_root)
    assert expected_checkpoint_abs == actual_checkpoint
