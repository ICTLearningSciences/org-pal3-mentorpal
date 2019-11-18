import os

from flask import Blueprint, current_app, jsonify, send_file
from werkzeug.utils import secure_filename

from mentor_api.errors import InvalidUsage
from mentor_classifier.mentor import Mentor

mentors_blueprint = Blueprint("mentors", __name__)


def _get_mentor_root():
    return current_app.config.get("MENTOR_DATA_ROOT")


@mentors_blueprint.route("/<mentor>", methods=["GET"])
def mentor(mentor):
    try:
        m = Mentor(mentor)
        return jsonify(
            {
                "id": m.id,
                "name": m.name,
                "short_name": m.short_name,
                "title": m.title,
                "intro_id": m.utterances_by_type["_INTRO_"][0][0],
                "intro_text": m.utterances_by_type["_INTRO_"][0][1],
            }
        )
    except BaseException:
        raise InvalidUsage(message=f"mentor not found for {mentor}", status_code=404)


@mentors_blueprint.route("/<mentor>/data", methods=["GET"])
def mentor_data(mentor):
    try:
        m = Mentor(mentor, mentor_data_root=_get_mentor_root())
        return jsonify(m.to_dict())
    except BaseException:
        raise InvalidUsage(message=f"mentor not found for {mentor}", status_code=404)


@mentors_blueprint.route("/<mentor>/data/<data_file>", methods=["GET"])
def data(mentor, data_file):
    file_path = os.path.join(
        _get_mentor_root(), mentor, "data", secure_filename(data_file)
    )
    if not os.path.exists(file_path):
        print(f"file not found: {file_path}")
        raise InvalidUsage(
            message=f"data file {data_file} not found for mentor {mentor}",
            status_code=404,
        )
    return send_file(file_path)


@mentors_blueprint.route("/<mentor>/tracks/<track_file>", methods=["GET"])
def tracks(mentor, track_file):
    file_name = secure_filename(track_file)
    file_ext = os.path.splitext(file_name)[1]
    file_path = os.path.join(_get_mentor_root(), mentor, "data", "tracks", file_name)
    if not os.path.exists(file_path):
        print(f"file not found: {file_path}")
        raise InvalidUsage(
            message=f"data file {track_file} not found for mentor {mentor}",
            status_code=404,
        )
    return send_file(
        file_path, attachment_filename=file_name, mimetype=f"text/{file_ext[1:]}"
    )
