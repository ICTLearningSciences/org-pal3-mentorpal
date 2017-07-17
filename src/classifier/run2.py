import interface
import win32pipe
import win32file
import msvcrt
import os

#mode='npceditor' will fetch answers only from npceditor.
#mode='classifier' will fetch answers only from classifier.
#mode='ensemble' will fetch answers from both classifier and ensemble and decide the best
bi=interface.BackendInterface(mode='ensemble')

# open server pipe from Unity
pipe = win32file.CreateFile("\\\\.\\pipe\\pipe_unity", win32pipe.PIPE_ACCESS_DUPLEX, 0, None, win32file.OPEN_EXISTING, 0, None)
read_fd = msvcrt.open_osfhandle(pipe, os.O_RDONLY)
reader = open(read_fd, "r")
input = reader.readline()
write_fd = msvcrt.open_osfhandle(pipe, os.O_WRONLY)
writer = open(write_fd, "w")

# get the list of topics
topics = bi.get_topics()

end_flag = False
while end_flag == False:
    input = input.replace('\r', '')
    input = input.replace('\n', '')
    print(input)
	
    # let Unity know the pipes are ready for communication
    if input == "_READY_":
        writer.write("_READY_")
    # send the list of topics
    elif input == "_TOPICS_":
        writer.write("_TOPICS_")
        for topic in topics:
            writer.write("\n")
            writer.write(topic)
    # finish the program
    elif input == "_QUIT_":
        writer.write("_QUIT_")
        end_flag = True
        break
    # get a question from the given topic
    elif input in topics:
        suggested_question=bi.suggest_question(input)
        writer.write("_TOPIC_QUESTION_")
        writer.write("\n")
        writer.write(suggested_question[0])
    # get a response for the given question
    else:
        video_file, transcript = bi.process_input_from_ui(input)
        print(video_file)
        print(transcript)
        writer.write(video_file)
        writer.write("\n")
        writer.write(transcript)

    writer.flush()
    input = reader.readline()

pipe.close()