# -- FILE: features/steps/example_steps.py
from behave import given, when, then, step


@given("an api request to {path}")
def step_impl(context, path):
    context.execute_steps(f"Given a request url {context.BASE_URL_API}/{path}")
