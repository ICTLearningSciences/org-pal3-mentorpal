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
print("CREATING PIPE...")
in_pipe = win32file.CreateFile("\\\\.\\pipe\\pipe_unity", win32file.GENERIC_READ | win32file.GENERIC_WRITE, 0, None, win32file.OPEN_EXISTING, 0, None)
print("CREATING READER...")
read_fd = msvcrt.open_osfhandle(in_pipe, os.O_RDONLY)
reader = open(read_fd, "r")
print("READING PIPE...")
input = reader.readline()
print("READ: " + input)

#out pipe to Unity
print("CREATING PIPE...")
out_pipe = win32pipe.CreateNamedPipe(r'\\.\pipe\pipe_python', win32pipe.PIPE_ACCESS_DUPLEX, win32pipe.PIPE_TYPE_MESSAGE | win32pipe.PIPE_WAIT, 1, 65536, 65536, 300, None)
print("CONNECTING TO PIPE...")
win32pipe.ConnectNamedPipe(out_pipe, None)
print("CREATING WRITER...")
write_fd = msvcrt.open_osfhandle(out_pipe, os.O_WRONLY)
writer = open(write_fd, "w")
print("MENTOR PAL IS READY TO GO")

end_flag = False
while end_flag == False:
    print("READ INPUT: " + input)
    if "_READY_" in input:
        writer.write("_READY_")
    elif "_QUIT_" in input:
        writer.write("_QUIT_")
        end_flag = True
        break
    elif "_START_SESSION_" in input:
        ec.start_session()
        writer.write("_SESSION_STARTED_")
    elif "_END_SESSION_" in input:
        #ec.end_session()
        writer.write("_SESSION_ENDED_")
    else:
        answer=ec.process_input_from_ui(input)
        writer.write(answer[0])
        writer.write("\n")
        writer.write(answer[1])
        print(answer[0])
        print(answer[1])
    writer.flush()
    input = reader.readline()

in_pipe.close()
out_pipe.close()