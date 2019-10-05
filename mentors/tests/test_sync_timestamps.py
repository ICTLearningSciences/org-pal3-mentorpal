import os
import pytest

from .helpers import assert_utterances_match_expected
from pipeline.mentorpath import MentorPath
from pipeline.process import sync_timestamps

MENTOR_DATA_ROOT = os.path.abspath(
    os.path.join(".", "tests", "resources", "test_sync_timestamps", "mentors")
)


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor1-clean-slate")]
)
def test_it_generates_utterances_from_timestamps(mentor_data_root: str, mentor_id: str):
    _test_synced_utterances_match_expected(mentor_data_root, mentor_id)


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id",
    [(MENTOR_DATA_ROOT, "mentor2-preserves-transcripts-when-merging")],
)
def test_it_preserves_transcripts_when_merging(mentor_data_root: str, mentor_id: str):
    _test_synced_utterances_match_expected(mentor_data_root, mentor_id)


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor3-fixes-smart-quotes")]
)
def test_it_fixes_smart_quotes(mentor_data_root: str, mentor_id: str):
    _test_synced_utterances_match_expected(mentor_data_root, mentor_id)


@pytest.mark.parametrize(
    "mentor_data_root,mentor_id", [(MENTOR_DATA_ROOT, "mentor4-assigns-asset-paths")]
)
def test_it_assigns_asset_paths(mentor_data_root: str, mentor_id: str):
    _test_synced_utterances_match_expected(mentor_data_root, mentor_id)


def _test_synced_utterances_match_expected(mentor_data_root: str, mentor_id: str):
    mp = MentorPath(mentor_id=mentor_id, root_path=mentor_data_root)
    actual_utterances = sync_timestamps(mp)
    assert_utterances_match_expected(actual_utterances, mp)
