import json
import os

from flask import Blueprint, current_app, jsonify, request, send_file
from werkzeug.utils import secure_filename

from mentor_api.errors import InvalidUsage
from mentor_api.mentors import find_mentor_classifier

# elif input_status=="_OFF_TOPIC_":
#             #load off-topic feedback clip and play it
#             if ('_OFF_TOPIC_' in self.mentor.utterances_prompts):
#                 len_offtopic=len(self.mentor.utterances_prompts['_OFF_TOPIC_'])
#                 index=random.randint(0,len_offtopic-1)
#                 return_id, return_answer=self.mentor.utterances_prompts['_OFF_TOPIC_'][index]
#                 return_score=-100.0

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