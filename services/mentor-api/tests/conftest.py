import pytest
from flask import Response
from mentor_api import create_app


@pytest.fixture
def app():
    myapp = create_app()
    myapp.debug = True
    myapp.response_class = Response
    return myapp
