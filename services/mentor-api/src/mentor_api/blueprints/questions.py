from flask import Blueprint, current_app, jsonify, request
from mentor_api.errors import InvalidUsage
from mentor_api.mentors import MentorClassifierRegistry


def create(mentor_classifier_registry):
    assert isinstance(mentor_classifier_registry, MentorClassifierRegistry)

    questions_blueprint = Blueprint("questions", __name__)

    @questions_blueprint.route("/", methods=["GET", "POST"])
    def queries():
        query = request.args["query"].strip()
        if not query:
            raise InvalidUsage(message="missing required param 'query'")
        mentor_id = request.args["mentor"].strip()
        if not mentor_id:
            raise InvalidUsage(message="missing required param 'mentor'")

        canned_question_match_disabled = request.args.get(
            "canned_question_match_disabled", False
        )
        if canned_question_match_disabled:
            canned_question_match_disabled = (
                canned_question_match_disabled.strip().casefold() == "true"
            )

        mc = None
        try:
            mc = mentor_classifier_registry.find_or_create(mentor_id)
        except BaseException:
            pass
        if mc is None:
            raise InvalidUsage(
                message=f"mentor not found for {mentor_id}", status_code=404
            )
        answer_id, answer_text, confidence = mc.get_answer(
            query, canned_question_match_disabled
        )
        return jsonify(
            {
                "answer_id": answer_id,
                "answer_text": answer_text,
                "confidence": confidence,
                "mentor": mentor_id,
                "query": query,
                "classifier": "{}/{}".format(
                    current_app.config["CLASSIFIER_ARCH"] or "arch_unknown",
                    current_app.config["CLASSIFIER_CHECKPOINT"] or "checkpoint_unknown",
                ),
            }
        )

    return questions_blueprint
