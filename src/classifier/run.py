import interface
import time

'''
This file is just a sample on how to start a session, ask questions to the program and end the session.
Use this as an example to write your own run.py file which will do the following:

1. Start a session
2. Ask questions and receives answers
3. Sends signals to ensemble.py to handle situations that might arise.
4. Ends session by setting end_flag=True
'''

#mode='npceditor' will fetch answers only from npceditor.
#mode='classifier' will fetch answers only from classifier.
#mode='ensemble' will fetch answers from both classifier and ensemble and decide the best
start=time.time()
bi=interface.BackendInterface(mode='ensemble')
end=time.time()
elapsed=end-start
print("Time to initialize is "+str(elapsed))
'''
Train the classifier from scratch
'''
bi.start_pipeline(mode='train_test_mode')

list_of_topics=bi.get_topics()

'''
Whenever you want a question suggestion after the user has clicked a topic button, send the topic to the 
function bi.suggest_question(topic) and it will return a tuple which looks like (question, answer, video_name)
'''
#suggested_question=bi.suggest_question('Advice')

print("Interface is ready")
end_flag=False
while not end_flag:
    user_input=input()
    response=bi.process_input_from_ui(user_input)
    if response[1]=='_END_':
        end_flag=True
        break
    else:
        video_file=response[0]
        transcript=response[1]
        print(video_file)
        print(transcript)