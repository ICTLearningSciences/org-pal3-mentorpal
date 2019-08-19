from flask import Blueprint, current_app, jsonify

config_blueprint = Blueprint("config", __name__)


@config_blueprint.route("/video-host", methods=["GET"])
def video_host():
    return jsonify({"url": current_app.config["MENTOR_VIDEO_HOST"]})
