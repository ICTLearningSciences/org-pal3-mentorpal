from watson_developer_cloud import SpeechToTextV1

'''
API credentials for the IBM Watson service are given below
Web login credentials for https://console.ng.bluemix.net/
Username: mentorpal.ict@gmail.com
Password: P@ssword123
Contact Madhusudhan Krishnamachari at madhusudhank@icloud.com to get assistance on how to use Watson. (IBM Documentation should help)
'''
speech_to_text = SpeechToTextV1(
    username='a9e2f186-462c-4109-b220-3cfcdc31c9f6',
    password='H27yANqAuMLr',
    x_watson_learning_opt_out=True #tells IBM Watson not to collect our data, hence keeping our data confidential and secure.
)

'''
Opens an audio .ogg file and calls the recognize function which transcribes the audio to text. That is stored in the `result` variable.
The result variable is a dictionary which contains sentences of transcriptions. We cycle through the result variable to get the actual text.

Note: Please make sure that the audio file is less than 100 MB in size. IBM Watson can't handle files larger than 100 MB.
For this project, the duration of each Q-A won't exceed 5 minutes and in that case, it will be well within 100 MB.
'''
def watson(file_name):
    with open(file_name,'r') as audio_file:
        result=speech_to_text.recognize(audio_file, content_type='audio/ogg' continuous=True)['results']
        transcript=""
        for item in result:
            transcript+=item['alternatives'][0]['transcript']
        return transcript
