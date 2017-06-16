import ensemble


'''
This file is just a sample on how to start a session, ask questions to the program and end the session.
Use this as an example to write your own run.py file which will do the following:

1. Start a session
2. Ask questions and receives answers
3. Sends signals to ensemble.py to handle situations that might arise.
4. Ends session by setting end_flag=True
'''
ec=ensemble.EnsembleClassifier()

'''
Train the classifier from scratch
'''
#ec.start_pipeline(mode='train_mode')

print("Interface is ready")
end_flag=False
while not end_flag:
    user_input=input()
    response=ec.process_input_from_ui(user_input)
    if response[1]=='_END_':
        end_flag=True
        break
    else:
        #Printing the response and storing it in a variable removes the weird characters. Write video_file and transcript to
        #the pipe for Unity
        video_file=print(response[0])
        transcript=print(response[1])