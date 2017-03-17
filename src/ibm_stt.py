import json
from os.path import join, dirname
from watson_developer_cloud import SpeechToTextV1

speech_to_text = SpeechToTextV1(
    username='a9e2f186-462c-4109-b220-3cfcdc31c9f6',
    password='H27yANqAuMLr',
    x_watson_learning_opt_out=True
)
def watson(file_name):
    with open(file_name,'rb') as audio_file:
        result=speech_to_text.recognize(audio_file, content_type='audio/wav', continuous=True)['results']
        transcript=""
        for item in result:
            transcript+=item['alternatives'][0]['transcript']
        transcript.replace('%HESITATION ','')
        return transcript
