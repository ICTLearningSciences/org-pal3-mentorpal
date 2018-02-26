import interface
import time
import mentor

#mode='npceditor' will fetch answers only from npceditor.
#mode='classifier' will fetch answers only from classifier.
#mode='ensemble' will fetch answers from both classifier and ensemble and decide the best
def start(answer_mode):
    start=time.time()
    global bi
    bi=interface.BackendInterface(mode=answer_mode)
    bi.preload()
    bi.use_repeats=False
    end=time.time()
    elapsed=end-start
    print("Time to initialize is "+str(elapsed))
    print("Interface is ready:")
    print("  Run training: _TRAIN_ <mentor id>")
    print("  Start a session: _START_SESSION_ <mentor id>")
    print("  Get topics: _TOPICS_ <mentor id>")
    print("  Get intro: _INTRO_ <mentor id>")
    print("  Get response: <question> <mentor id>")
    print("  Get idle: _IDLE_ <mentor id>")
    print("  Get prompt: _TIME_OUT_ <mentor id>")
    print("  Get topic question suggestion: _TOPIC_QUESTION_ <topic> <mentor id>")
    print("  End current session: _END_SESSION_")
    print("  End program: _QUIT_")

def process_input(user_input):
    inputs = user_input.split(' ')
    tag = inputs[0]
    
    # start a conversation with a mentor
    # _START_SESSION_ <mentor id>
    if tag == "_START_SESSION_":
        id = inputs[1]
        bi.set_mentor(id)
        tag, name, title = bi.process_input_from_ui(inputs[0])
        return "{0}\n{1}\n{2}\n{3}".format(id, tag, name, title)

    # end the current conversation and record question/answers
    if inputs[0] == "_END_SESSION_":
        id = "temp_id"
        bi.process_input_from_ui(inputs[0])
        return "{0}\n{1}".format(id, "_END_")

    # get the list of topics for a mentor
    # _TOPICS_ <mentor id>
    if inputs[0] == "_TOPICS_":
        id = inputs[1]
        bi.set_mentor(id)
        topics = bi.get_topics()
        return '_TOPICS_\n{0}'.format('\n'.join(topics))

    # get a random question from the given topic
    # _TOPIC_QUESTION_
    if inputs[0] == "_TOPIC_QUESTION_":
        suggested_question=bi.suggest_question(inputs[1])
        return '_TOPIC_QUESTION_\n{0}'.format(suggested_question[0])

    # close the program and shut down all processes
    if tag == "_QUIT_":
        if bi.session_started == True:
            bi.process_input_from_ui("_END_SESSION_")
        bi.quit()
        global end_flag
        end_flag=True
        return '_QUIT_'

    # retrain the classifier for the given mentor
    # _TRAIN_ <mentor id>
    if tag == "_TRAIN_":
        id = inputs[1]
        bi.set_mentor(id)
        bi.start_pipeline(mode='train_mode')
        return '_TRAINED_ {0}'.format(id)
        
    # get a unique redirect video
    # _REDIRECT_ <mentor id>
    if tag == "_REDIRECT_":
        id = inputs[1]
        bi.set_mentor(id)
        video_file, transcript, score = bi.get_redirect_answer()
        return "{0}\n{1}\n{2}\n{3}".format(id, video_file, transcript, score)

    # give an answer for the given question and mentor
    # <question> <mentor id>
    else:
        id = inputs[len(inputs) - 1]
        bi.set_mentor(id)
        video_file, transcript, score = bi.process_input_from_ui(" ".join(inputs[:-1]))
        return "{0}\n{1}\n{2}\n{3}".format(id, video_file, transcript, score)

bi = None
end_flag=False