import os

class Config(object):
    SECRET_KEY = os.environ.get('SECRET_KEY') or 'production_servers_must_provide_a_secret_key'

    # override with a list of ids for mentors
    # that should preload with the server
    MENTOR_IDS_PRELOAD = [ ]

    MENTOR_DATA = '/app/mentors'