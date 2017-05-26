import ensemble


'''
This file is just a sample on how to start a session, ask questions to the program and end the session.
'''
ec=ensemble.EnsembleClassifier()

'''
Train the classifier from scratch
'''
#ec.start_pipeline(mode='train_mode')


end_flag=False
#start the session
ec.start_session()

#while the session is in progress
while not end_flag:
    answer=ec.answer_the_question("What is your name?")
    
#end the session
ec.end_session()