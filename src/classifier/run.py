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

def preload(mentors):
    bi.preload(mentors)

def print_instructions():
    print("Interface is ready:")
    print("  Start a session:   _START_SESSION_     <mentor id>     <use repeat answers Y/N>")
    print("  End session:       _END_SESSION_")
    print("  Run training:      _TRAIN_             <mentor id>")
    print("  Get topics:        _TOPICS_            <mentor id>")
    print("  Get intro:         _INTRO_             <mentor id>")
    print("  Get idle:          _IDLE_              <mentor id>")
    print("  Get prompt:        _TIME_OUT_          <mentor id>")
    print("  Get question:      _QUESTION_          <mentor id>     <topic>")
    print("  Get response:      _ANSWER_            <mentor id>     <question>")
    print("  Get redirect:      _REDIRECT_          <mentor id>     <question>")
    print("  Close the program and shut down all processes: _QUIT_")

def process_input(user_input):
    inputs = user_input.split(' ')
    tag = inputs[0]
    print(user_input)

    # Load a session with a mentor: _START_SESSION_ id use_repeats
    #   id:             id of mentor
    #   use_repeats:    mentor should repeat answers that have already been given (does not answer "I have already answered that question")
    #
    # Returns: mentor_id _START_ mentor_name mentor_title
    if tag == "_START_SESSION_":
        id = inputs[1]
        bi.set_mentor(id)
        bi.use_repeats = len(inputs) == 3 and inputs[2] == "Y"
        tag, name, title = bi.process_input_from_ui(inputs[0])
        return "{0}\n{1}\n{2}\n{3}".format(id, tag, name, title)

    # End current session with mentor and record questions/answers in text file: _END_SESSION_
    #
    # Returns: mentor_id _END_
    if inputs[0] == "_END_SESSION_":
        id = "temp_id"
        bi.process_input_from_ui(inputs[0])
        return "{0}\n{1}".format(id, "_END_")

    # Retrain and retest the classifier for a mentor: _TRAIN_ id
    #   id: id of mentor
    #
    # Returns: _TRAINED_ mentor_id 
    if tag == "_TRAIN_":
        id = inputs[1]
        bi.set_mentor(id)
        results = bi.start_pipeline(mode='train_test_mode')
        return '_TRAINED_ {0}\n{1}'.format(id, results)

    # Get the list of topics for a mentor:  _TOPICS_ id
    #   id: id of mentor
    #
    # Returns: _TOPIC_ list_of_topics
    if inputs[0] == "_TOPICS_":
        id = inputs[1]
        bi.set_mentor(id)
        topics = bi.get_topics()
        return '_TOPICS_\n{0}'.format('\n'.join(topics))

    # Get a question from the given topic for a mentor: _QUESTION_ id topic
    #   id: id of mentor
    #   topic: name of topic
    #
    # Returns: _QUESTION_ question
    if inputs[0] == "_QUESTION_":
        id = inputs[1]
        topic = inputs[2]
        bi.set_mentor(id)
        suggested_question=bi.suggest_question(topic)
        return '_QUESTION_\n{0}'.format(suggested_question[0])

    # Get a unique redirect video: _REDIRECT_ id
    #   id: id of mentor
    #
    # Returns: _QUESTION_ question
    if tag == "_REDIRECT_":
        id = inputs[1]
        bi.set_mentor(id)
        video_file, transcript, score = bi.get_redirect_answer()
        return "{0}\n{1}\n{2}\n{3}".format(id, video_file, transcript, score)

    if tag == "_INTRO_" or tag == "_IDLE_" or tag == "_TIME_OUT_":
        id = inputs[1]
        bi.set_mentor(id)
        video_file, transcript, score = bi.process_input_from_ui(tag)
        return "{0}\n{1}\n{2}\n{3}".format(id, video_file, transcript, score)

    # Get an answer to the question from a mentor: _ANSWER_ id question
    #   id: id of mentor
    #   question: question to answer
    #
    # Returns: mentor_id video_url transcript accuracy_score
    if tag == "_ANSWER_":
        id = inputs[1]
        question = " ".join(inputs[2:])
        bi.set_mentor(id)
        video_file, transcript, score = bi.process_input_from_ui(question)
        return "{0}\n{1}\n{2}\n{3}".format(id, video_file, transcript, score)

    # End the session, close the program and shut down all processes: _QUIT_
    #
    # Returns: _QUIT_
    if tag == "_QUIT_":
        if bi.session_started == True:
            bi.process_input_from_ui("_END_SESSION_")
        bi.quit()
        global end_flag
        end_flag=True
        return '_QUIT_'

bi = None
end_flag=False
