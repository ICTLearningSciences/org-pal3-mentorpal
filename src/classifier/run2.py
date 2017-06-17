import ensemble
import win32pipe
import win32file
import msvcrt
import os

'''
This file is just a sample on how to start a session, ask questions to the program and end the session.
Use this as an example to write your own run.py file which will do the following:

1. Start a session
2. Ask questions and receives answers
3. Sends signals to ensemble.py to handle situations that might arise.
4. Ends session by setting end_flag=True
'''
ec=ensemble.EnsembleClassifier()

# open server pipe from Unity
pipe = win32file.CreateFile("\\\\.\\pipe\\pipe_unity", win32pipe.PIPE_ACCESS_DUPLEX, 0, None, win32file.OPEN_EXISTING, 0, None)
read_fd = msvcrt.open_osfhandle(pipe, os.O_RDONLY)
reader = open(read_fd, "r")
input = reader.readline()
write_fd = msvcrt.open_osfhandle(pipe, os.O_WRONLY)
writer = open(write_fd, "w")

end_flag = False

while end_flag == False:
    print("input = " + input)
    input = input.replace('\r', '')
    input = input.replace('\n', '')

    if input == "_READY_":
        writer.write("_READY_")
    elif input == "_QUIT_":
        writer.write("_QUIT_")
        end_flag = True
        break
    else:
        response=ec.process_input_from_ui(input)
        writer.write(response[0])
        writer.write("\n")
        writer.write(response[1])

    writer.flush()
    input = reader.readline()

pipe.close()