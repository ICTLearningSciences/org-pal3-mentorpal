# This software is Copyright ©️ 2020 The University of Southern California. All Rights Reserved.
# Permission to use, copy, modify, and distribute this software and its documentation for educational, research and non-profit purposes, without fee, and without a written agreement is hereby granted, provided that the above copyright notice and subject to the full license file found in the root of this software deliverable. Permission to make commercial use of this software may be obtained by contacting:  USC Stevens Center for Innovation University of Southern California 1150 S. Olive Street, Suite 2300, Los Angeles, CA 90115, USA Email: accounting@stevens.usc.edu
#
# The full terms of this copyright and license should always be found in the root directory of this software deliverable as "license.txt" and if these terms are not found with this software, please contact the USC Stevens Center for the full license.
import os

import behave_restful.app as br_app


def before_all(context):
    this_directory = os.path.abspath(os.path.dirname(__file__))
    br_app.BehaveRestfulApp().initialize_context(context, this_directory)
    context.hooks.invoke(br_app.BEFORE_ALL, context)

    context.BASE_URL_API = "https://pal.ict.usc.edu/api/1.0"


def after_all(context):
    context.hooks.invoke(br_app.AFTER_ALL, context)


def before_feature(context, feature):
    context.hooks.invoke(br_app.BEFORE_FEATURE, context, feature)


def after_feature(context, feature):
    context.hooks.invoke(br_app.AFTER_FEATURE, context, feature)


def before_scenario(context, scenario):
    context.hooks.invoke(br_app.BEFORE_SCENARIO, context, scenario)


def after_scenario(context, scenario):
    context.hooks.invoke(br_app.AFTER_SCENARIO, context, scenario)


def before_step(context, step):
    context.hooks.invoke(br_app.BEFORE_STEP, context, step)


def after_step(context, step):
    context.hooks.invoke(br_app.AFTER_STEP, context, step)


def before_tag(context, tag):
    context.hooks.invoke(br_app.BEFORE_TAG, context, tag)


def after_tag(context, tag):
    context.hooks.invoke(br_app.AFTER_TAG, context, tag)
