import math


def convert_to_seconds(time):
    time = time.split(":")
    hours = 0
    minutes = 0
    seconds = 0
    if len(time) == 2:
        minutes, seconds = time[0], time[1]
    else:
        hours, minutes, seconds = time[0], time[1], time[2]
    hours = int(hours)
    minutes = int(minutes)
    seconds = float(seconds)
    result = int(3600 * hours + 60 * minutes + seconds)
    return result


def find(s, ch):  # gives indexes of all of the spaces so we don't split words apart
    return [i for i, ltr in enumerate(s) if ltr == ch]


def transcript_to_vtt(transcript: str, duration: float) -> str:
    pieceLength = 68
    wordIndexes = find(transcript, " ")
    splitIndex = [0]
    for k in range(1, len(wordIndexes)):
        for l in range(1, len(wordIndexes)):
            if wordIndexes[l] > pieceLength * k:
                splitIndex.append(wordIndexes[l])
                break
    splitIndex.append(len(transcript))
    amountOfChunks = math.ceil(len(transcript) / pieceLength)
    vtt_str = "WEBVTT FILE:\n\n"
    for j in range(len(splitIndex) - 1):  # this uses a constant piece length
        secondsStart = round((duration / amountOfChunks) * j, 2) + 0.85
        secondsEnd = round((duration / amountOfChunks) * (j + 1), 2) + 0.85
        outputStart = (
            str(math.floor(secondsStart / 60)).zfill(2)
            + ":"
            + ("%.3f" % (secondsStart % 60)).zfill(6)
        )
        outputEnd = (
            str(math.floor(secondsEnd / 60)).zfill(2)
            + ":"
            + ("%.3f" % (secondsEnd % 60)).zfill(6)
        )
        vtt_str += f"00:{outputStart} --> 00:{outputEnd}\n"
        vtt_str += f"{transcript[splitIndex[j] : splitIndex[j + 1]]}\n\n"
    return vtt_str
