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
    result = sum(s * int(a) for s, a in zip(time_adjustments, time_split))
    return result
