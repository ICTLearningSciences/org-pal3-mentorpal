from os import path
import pytest
from flask import Response
from mentor_api import create_app


@pytest.fixture
def app():
    myapp = create_app()
    pwd = path.dirname(path.realpath(__file__))
    myapp.config["MENTOR_DATA_ROOT"] = path.join(pwd, "resources", "mentors")
    myapp.debug = True
    myapp.response_class = Response
    return myapp
