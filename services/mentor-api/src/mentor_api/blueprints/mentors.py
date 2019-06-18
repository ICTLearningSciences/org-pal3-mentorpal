import os

from flask import Blueprint, current_app, send_file
from werkzeug.utils import secure_filename

from mentor_api.errors import InvalidUsage

mentors_blueprint = Blueprint("mentors", __name__)


@mentors_blueprint.route("/<mentor>/data/<data_file>", methods=["GET"])
def data(mentor, data_file):
    mentor_data_root = current_app.config["MENTOR_DATA"]
    file_path = os.path.join(
        mentor_data_root, mentor, "data", secure_filename(data_file)
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
    mentor_data_root = current_app.config["MENTOR_DATA"]
    file_name = secure_filename(track_file)
    file_ext = os.path.splitext(file_name)[1]
    file_path = os.path.join(mentor_data_root, mentor, "data", "tracks", file_name)
    if not os.path.exists(file_path):
        print(f"file not found: {file_path}")
        raise InvalidUsage(
            message=f"data file {track_file} not found for mentor {mentor}",
            status_code=404,
        )
    return send_file(
        file_path, attachment_filename=file_name, mimetype=f"text/{file_ext[1:]}"
    )
