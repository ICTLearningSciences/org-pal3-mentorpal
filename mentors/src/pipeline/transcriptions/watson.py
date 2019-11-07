import os

from watson_developer_cloud import SpeechToTextV1

from . import TranscriptionService

"""
This script communicates with IBM Watson to generate transcripts for mentor audiochunks
"""


class WatsonTranscriptionService(TranscriptionService):
    def init_service(self):
        """
        API credentials for the IBM Watson service are given below
        Web login credentials for https://console.ng.bluemix.net/
        Credentials File: Ask Ben Nye for it
        Place the text file containing the credentials file in the root of the website version code
        Contact Madhusudhan Krishnamachari at madhusudhank@icloud.com to get assistance on how to use Watson. (IBM Documentation should help)
        """
        username = os.environ["WATSON_USERNAME"]
        password = os.environ["WATSON_PASSWORD"]

        if not (username and password):
            raise (Exception("missing WATSON_USERNAME or WATSON_PASSWORD"))
        else:
            self.speech_to_text = SpeechToTextV1(username=username, password=password)
            # tell IBM Watson not to collect our data
            self.speech_to_text.set_default_headers(
                {"x-watson-learning-opt-out": "true"}
            )

    def transcribe(self, audio_file: str) -> str:
        """
        Opens an audio .ogg file and calls the recognize function which transcribes the audio to text. That is stored in the `result` variable.
        The result variable is a dictionary which contains sentences of transcriptions. We cycle through the result variable to get the actual text.

        Note: Please make sure that the audio file is less than 100 MB in size. IBM Watson can't handle files larger than 100 MB.
        For this project, the duration of each Q-A won't exceed 5 minutes and in that case, it will be well within 100 MB.
        """
        if not self.speech_to_text:
            self.init_service()
        with open(audio_file, "rb") as f:
            result = self.speech_to_text.recognize(
                f, content_type="audio/mp3", continuous=True
            ).result["results"]
            transcript = "".join(
                item["alternatives"][0]["transcript"] for item in result
            )
            return transcript
