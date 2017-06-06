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
print("You can ask questions now")
a=input()
while a != 'exit':
    answer=ec.answer_the_question(a)
    print("Video file: "+answer[0])
    print("Transcript: "+answer[1])
    a=input()


# end_flag=False

# #start the session
# ec.start_session()

# #while the session is in progress
# while not end_flag:
#     answer=ec.answer_the_question("Timeout")
    
# #end the session
# ec.end_session()