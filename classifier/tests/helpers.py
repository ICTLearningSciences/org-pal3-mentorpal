import os


def resource_root_for_test(test_file: str) -> str:
    return os.path.abspath(
        os.path.join(
            ".", "tests", "resources", os.path.splitext(os.path.basename(test_file))[0]
        )
    )


def resource_root_checkpoints_for_test(test_file: str) -> str:
    return os.path.join(resource_root_for_test(test_file), "checkpoint")
