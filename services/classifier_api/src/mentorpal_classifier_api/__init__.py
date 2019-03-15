import os
import json
from flask import Flask, jsonify
from flask_cors import CORS
from mentorpal_classifier_api.errors import InvalidUsage
from mentorpal_classifier_api.mentors import find_mentor_classifier
from mentorpal_classifier_api.config_default import Config

def create_app(script_info=None):

    app = Flask(__name__)

    # enable CORS
    CORS(app)

    app.config.from_object(Config)

    config_path = os.environ.get('MENTORPAL_CLASSIFIER_API_SETTINGS')
    if not config_path:
        print('use MENTORPAL_CLASSIFIER_API_SETTINGS environment var to configure instances')
    elif not os.path.exists(config_path):
        print(f'config file not found for MENTORPAL_CLASSIFIER_API_SETTINGS val ${config_path}')
    else:
        app.config.from_envvar('MENTORPAL_CLASSIFIER_API_SETTINGS')

    for id in app.config['MENTOR_IDS_PRELOAD']:
        find_mentor_classifier(id)

    @app.errorhandler(InvalidUsage)
    def handle_invalid_usage(error):
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    # register blueprints
    from mentorpal_classifier_api.questions import questions_blueprint
    app.register_blueprint(questions_blueprint, url_prefix='/questions')

    return app
