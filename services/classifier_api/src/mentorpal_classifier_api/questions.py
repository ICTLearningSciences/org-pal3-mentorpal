import os
import json
from flask import Blueprint, jsonify, request
from mentorpal_classifier_api.errors import InvalidUsage
from mentorpal_classifier_api.mentors import find_mentor_classifier


questions_blueprint = Blueprint('questions', __name__)

# @questions_blueprint.route('/')
# def index():
#     return jsonify({
#         'version': '1.0'
#     })

@questions_blueprint.route('/ping', methods=['GET'])
def ping():
    return jsonify({
        'status': 'success',
        'message': 'pong!',
        'container_id': os.uname()[1]
    })


@questions_blueprint.route('/', methods=['GET','POST'])
def queries():
    query = request.args['query'].strip()

    if not query:
        raise InvalidUsage(
            message="missing required param 'query'"
        )

    mentor_id = request.args['mentor'].strip()
    if not mentor_id:
        raise InvalidUsage(
            message="missing required param 'mentor'"
        )

    mc = None
    try:
        mc = find_mentor_classifier(mentor_id)
    except:
        pass

    if mc is None:
        raise InvalidUsage(
            message=f'mentor not found for {mentor_id}',
            status_code=404
        )

    answer_id, answer_text, confidence = mc.get_answer(query)

    return jsonify({
        'answer_id': answer_id,
        'answer_text': answer_text,
        'confidence': confidence,
        'mentor': mentor_id,
        'query': query
    })