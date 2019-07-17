import os


class Config(object):
    SECRET_KEY = (
        os.environ.get("SECRET_KEY") or "production_servers_must_provide_a_secret_key"
    )

    # override with a list of ids for mentors
    # that should preload with the server
    MENTOR_IDS_PRELOAD = []

    MENTOR_DATA = "/app/mentors"

    CLASSIFIER_ARCH = os.environ.get("CLASSIFIER_ARCH") or "lstm_v1"
    CLASSIFIER_CHECKPOINT = os.environ.get("CLASSIFIER_CHECKPOINT") or "2019-06-13-1900"
    CLASSIFIER_CHECKPOINT_ROOT = (
        os.environ.get("CLASSIFIER_CHECKPOINT_ROOT") or "/app/checkpoint"
    )
