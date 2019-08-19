import pandas as pd


def convert_to_seconds(time):
    """
    Converts a timestamp from HH:MM:SS or MM:SS to seconds.
    For example, a time 01:03:45 is 01*3600 + 03*60 + 45 = 3825 seconds

    Parameters:
    time: time string
    """
    time_adjustments = [3600, 60, 1]
    time_split = time.split(":")
    if len(time_split) == 2:  # TODO: Remove this when data is standardized
        time_split.insert(0, 00)
    result = sum(s * float(a) for s, a in zip(time_adjustments, time_split))
    return result


def load_timestamp_data(filename):
    # Pandas reads empty cells as 0, replace with empty string
    timestamps_file = pd.read_csv(filename).fillna("")
    rows = range(0, len(timestamps_file))
    text_type = [timestamps_file.iloc[i]["Answer/Utterance"] for i in rows]
    questions = [timestamps_file.iloc[i]["Question"] for i in rows]
    start_times = [timestamps_file.iloc[i]["Response start"] for i in rows]
    end_times = [timestamps_file.iloc[i]["Response end"] for i in rows]

    start_times = [convert_to_seconds(time) for time in start_times]
    end_times = [convert_to_seconds(time) for time in end_times]

    return text_type, questions, start_times, end_times
