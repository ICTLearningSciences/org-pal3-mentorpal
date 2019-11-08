import os
from pathlib import Path


class Config(object):
    SECRET_KEY = (
        os.environ.get("SECRET_KEY") or "production_servers_must_provide_a_secret_key"
    )
    CLASSIFIER_ARCH = os.environ.get("CLASSIFIER_ARCH")
    CLASSIFIER_CHECKPOINT = os.environ.get("CLASSIFIER_CHECKPOINT") or os.environ.get(
        "CHECKPOINT"
    )
    CLASSIFIER_CHECKPOINT_ROOT = os.environ.get("CLASSIFIER_CHECKPOINT_ROOT") or str(
        Path("/app/checkpoint")
    )
    # override with a list of ids for mentors
    # that should preload with the server
    MENTOR_IDS_PRELOAD = []
    MENTOR_DATA_ROOT = os.environ.get("MENTOR_DATA_ROOT") or str(Path("/app/mentors"))
    MENTOR_VIDEO_HOST = (
        os.environ.get("MENTOR_VIDEO_HOST") or "https://video.mentorpal.org"
    )
