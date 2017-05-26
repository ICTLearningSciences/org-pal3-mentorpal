import ensemble

ec=ensemble.EnsembleClassifier()

'''
Train the classifier from scratch
'''
#ec.start_pipeline(mode='train_mode')


answer=ec.answer_the_question("What is your name?")
print answer