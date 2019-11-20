from logging.config import dictConfig
import os
from flask import Flask, jsonify
from flask_cors import CORS
from mentor_api.errors import InvalidUsage
from mentor_api.mentors import MentorClassifierRegistry
from mentor_api.config_default import Config
from mentor_classifier.classifiers import create_classifier_factory


def create_app(script_info=None):
    dictConfig(
        {
            "version": 1,
            "formatters": {
                "default": {
                    "format": "[%(asctime)s] %(levelname)s in %(module)s: %(message)s"
                }
            },
            "handlers": {
                "wsgi": {
                    "class": "logging.StreamHandler",
                    "stream": "ext://flask.logging.wsgi_errors_stream",
                    "formatter": "default",
                }
            },
            "root": {"level": "INFO", "handlers": ["wsgi"]},
        }
    )
    app = Flask(__name__)
    # enable CORS
    CORS(app)
    app.config.from_object(Config)
    config_path = os.environ.get("MENTORPAL_CLASSIFIER_API_SETTINGS")
    if not config_path:
        print(
            "use MENTORPAL_CLASSIFIER_API_SETTINGS environment var to configure instances"
        )
    elif not os.path.exists(config_path):
        print(
            f"config file not found for MENTORPAL_CLASSIFIER_API_SETTINGS val ${config_path}"
        )
    else:
        app.config.from_envvar("MENTORPAL_CLASSIFIER_API_SETTINGS")
    classifier_registry = MentorClassifierRegistry(
        create_classifier_factory(
            checkpoint_root=app.config["CLASSIFIER_CHECKPOINT_ROOT"],
            arch=app.config["CLASSIFIER_ARCH"],
            checkpoint=app.config["CLASSIFIER_CHECKPOINT"],
        )
    )
    for id in app.config["MENTOR_IDS_PRELOAD"]:
        classifier_registry.find_or_create(id)

    @app.errorhandler(InvalidUsage)
    def handle_invalid_usage(error):
        response = jsonify(error.to_dict())
        response.status_code = error.status_code
        return response

    # register blueprints
    from mentor_api.blueprints.ping import ping_blueprint

    app.register_blueprint(ping_blueprint, url_prefix="/mentor-api/ping")

    from mentor_api.blueprints.config import config_blueprint

    app.register_blueprint(config_blueprint, url_prefix="/mentor-api/config")

    from mentor_api.blueprints.questions import create as create_questions_blueprint

    app.register_blueprint(
        create_questions_blueprint(classifier_registry),
        url_prefix="/mentor-api/questions",
    )

    from mentor_api.blueprints.mentors import mentors_blueprint

    app.register_blueprint(mentors_blueprint, url_prefix="/mentor-api/mentors")

    return app
