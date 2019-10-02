import argparse
import os

from pipeline.run import Pipeline


def _get_mentors_data_root(args) -> str:
    return args.data or os.path.join(os.path.curdir, "data", "mentors")


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "-c", "--command", required=True, help="command to perform: (sync-timestamps)"
    )
    parser.add_argument("-m", "--mentor", required=True, help="the mentor")
    parser.add_argument("--data", help="the path to the root of all mentors")
    args = parser.parse_args()
    mentor_data = _get_mentors_data_root(args)
    p = Pipeline(args.mentor, mentor_data)
    if args.command == "sync-timestamps":
        p.sync_timestamps()


if __name__ == "__main__":
    main()
