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

#in pipe from Unity
in_pipe = win32file.CreateFile("\\\\.\\pipe\\pipe_unity", win32file.GENERIC_READ | win32file.GENERIC_WRITE, 0, None, win32file.OPEN_EXISTING, 0, None)
read_fd = msvcrt.open_osfhandle(in_pipe, os.O_RDONLY)
reader = open(read_fd, "r")
input = reader.readline()

#out pipe to Unity
out_pipe = win32pipe.CreateNamedPipe(r'\\.\pipe\pipe_python', win32pipe.PIPE_ACCESS_DUPLEX, win32pipe.PIPE_TYPE_MESSAGE | win32pipe.PIPE_WAIT, 10, 65536, 65536, 300, None)
win32pipe.ConnectNamedPipe(out_pipe, None)
write_fd = msvcrt.open_osfhandle(out_pipe, os.O_WRONLY)
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
    elif input == "_END_SESSION_":
        #ec.end_session()
        writer.write("no_video")
        writer.write("\n")
        writer.write("_END_")
    else:
        answer=ec.process_input_from_ui(input)
        writer.write(answer[0])
        writer.write("\n")
        writer.write(answer[1])

    writer.flush()
    input = reader.readline()

in_pipe.close()
out_pipe.close()
