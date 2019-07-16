from watson_developer_cloud import SpeechToTextV1


"""
API credentials for the IBM Watson service are given below
Web login credentials for https://console.ng.bluemix.net/
Username: mentorpal.ict@gmail.com
Password: Ask Ben Nye for it
Place the text file containing the private key in the root of the website version code
Contact Madhusudhan Krishnamachari at madhusudhank@icloud.com to get assistance on how to use Watson. (IBM Documentation should help)
"""
passphrase = ""
with open("src/data_pipeline/secrets/password.txt", "r") as password:
    passphrase = password.read()
speech_to_text = SpeechToTextV1(
    username="b339aacb-e633-4e40-b10d-6f5b300f59bf", password=passphrase
)
speech_to_text.set_default_headers(
    {"x-watson-learning-opt-out": "true"}
)  # tells IBM Watson not to collect our data, hence keeping our data confidential and secure.


def generate_transcript(file_name):
    """
    Opens an audio .ogg file and calls the recognize function which transcribes the audio to text. That is stored in the `result` variable.
    The result variable is a dictionary which contains sentences of transcriptions. We cycle through the result variable to get the actual text.

    Note: Please make sure that the audio file is less than 100 MB in size. IBM Watson can't handle files larger than 100 MB.
    For this project, the duration of each Q-A won't exceed 5 minutes and in that case, it will be well within 100 MB.
    """
    with open(file_name, "rb") as audio_file:
        result = speech_to_text.recognize(
            audio_file, content_type="audio/ogg", continuous=True
        ).result["results"]
        transcript = "".join(item["alternatives"][0]["transcript"] for item in result)
        print(transcript)
        return transcript
