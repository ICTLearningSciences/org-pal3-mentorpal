import run
import win32pipe
import win32file
import msvcrt
import os

run.start('ensemble')
# open server pipe from Unity
pipe = win32file.CreateFile("\\\\.\\pipe\\pipe_unity", win32pipe.PIPE_ACCESS_DUPLEX, 0, None, win32file.OPEN_EXISTING, 0, None)
read_fd = msvcrt.open_osfhandle(pipe, os.O_RDONLY)
reader = open(read_fd, "r")
input = reader.readline()
write_fd = msvcrt.open_osfhandle(pipe, os.O_WRONLY)
writer = open(write_fd, "w")

while not run.end_flag:
    inputs = input.replace('\r', '').replace('\n', '').split(" ")
    if inputs[0] == "_READY_":
        writer.write("_READY_")
    else:
        output = run.process_input(input.replace('\r', '').replace('\n', ''))
        if not run.end_flag:
            writer.write(output)
            writer.flush()
            input = reader.readline()

pipe.close()