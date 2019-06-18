from behave import given


@given("an api request to {path}")
def step_impl(context, path):
    context.execute_steps(f"Given a request url {context.BASE_URL_API}/{path}")
