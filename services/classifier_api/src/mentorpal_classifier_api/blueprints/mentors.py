import json
import os

from flask import Blueprint, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename

from mentorpal_classifier_api.errors import InvalidUsage
from mentorpal_classifier_api.mentors import find_mentor_classifier


mentors_blueprint = Blueprint('mentors', __name__)

@mentors_blueprint.route('/<mentor>/data/<data_file>', methods=['GET'])
def data(mentor, data_file):
    mentor_data_root = current_app.config['MENTOR_DATA']
    file_path = os.path.join(
        mentor_data_root, mentor, 'data', secure_filename(data_file)
    )

    if not os.path.exists(file_path):
        print(f'file not found: {file_path}')
        raise InvalidUsage(
            message=f'data file {data_file} not found for mentor {mentor}',
            status_code=404
        )

    return send_file(file_path)

@mentors_blueprint.route('/<mentor>/tracks/<track_file>', methods=['GET'])
def tracks(mentor, track_file):
    mentor_data_root = current_app.config['MENTOR_DATA']
    file_path = os.path.join(
        mentor_data_root, mentor, 'data', 'tracks', secure_filename(track_file)
    )

    if not os.path.exists(file_path):
        print(f'file not found: {file_path}')
        raise InvalidUsage(
            message=f'data file {track_file} not found for mentor {mentor}',
            status_code=404
        )

    return send_file(file_path)